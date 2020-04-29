const axios = require('axios');
const config = require('./config.json');
const fs = require('fs');


var getReports = async function(clientId, timestamps) {// this becomes an async function
  var allReports = [];
  for (var i = 0; i < clientId.length; i++) {
    var singleClientReport = [];
    for (var j = 0; j < timestamps.length; j++) {
      query = {
        "login": {
          "oauth_key": `${config.oauth}`
        },
        "user": {
          "fingerprint": `${config.fingerprint}`
        },
        "filter": {
          "page" : 1,
        "query": `{\"client_id\" : \"${clientId[i]}\", \"time_stamp\" : {\"$gte\" : ${timestamps[j][0]}, \"$lte\" : ${timestamps[j][1]}}}`,
        "show_report": true
        }
      }
      try {
          const monthly_report = (await axios.post(config.url, query)).data.reports[0]
          singleClientReport.push(monthly_report);
          // console.log(monthly_report)
        } catch(error) {
          console.log(error)
        } 
    }
    allReports.push(singleClientReport)
  }
  generateBulkReport(allReports, timestamps.length)
}

var generateReport = function(reports, timeframe) {
  var data = {};
  for (var i = 0; i < reports.length; i++) {
    var checking_subnets = reports[i]["checking_subnets"];
    var debit_card_subnets = reports[i]["debit_card_subnets"];
    var transactions = reports[i]["transactions"];
    var user_flags = reports[i]["user_flags"];
    var user_permissions = reports[i]["user_permissions"];
    var balances = reports[i]["balances"]
    var internal_nodes = reports[i]["internal_nodes"];
    var external_nodes = reports[i]["external_nodes"];
    var rdc_report = reports[i]["rdc_report"];
    var ach_report = reports[i]["ach_report"];
    var interchange_report = reports[i]["interchange_report"];
    var ofac_matches = reports[i]["ofac_matches"]
    user_and_report_count(user_permissions, "user_permissions", data);
    user_and_report_count(rdc_report, "rdc_report", data);
    user_and_report_count(ach_report, "ach_report", data);
    user_and_report_count(interchange_report, "interchange_report", data);
    user_and_report_count(user_flags, "user", data);
    user_and_report_count(checking_subnets, "checking_subnets", data);
    user_and_report_count(debit_card_subnets, "debit_card_subnets", data);
    amount_count(transactions, "transactions", data);
    amount_count(internal_nodes, "internal_nodes", data);
    amount_count(external_nodes, "external_nodes", data);
    amount_count(balances, "balances", data);
    getOfacMatches(ofac_matches, "ofac_matches", data);
  }
  return data;
}

var getOfacMatches = function(matches, type, data) { //Ofac matches are key values, no need to iterate through object
  if (!data["user"][type]) {
    data["user"][type] = []
  }
  data["user"][type].push(matches)
}

var user_and_report_count = function(count, type, data) { //Iterating through single objects
  if (!data[type]) {
    data[type] = {}
  }
  var totalUsers = 0;
  for (var permission in count) {
    if (data[type][permission]) {
      data[type][permission].push(count[permission])
    } else {
      data[type][permission] = [count[permission]]
    }
    totalUsers += count[permission]
  }
  if (type === "user_permissions") {
    if (data[type]["total_users"]) {
      data[type]["total_users"].push(totalUsers)
    } else {
      data[type]["total_users"] = [totalUsers]
    }
  }
  return data;
}

var amount_count = function(node, internal_external, data) { //Iterating through nested objects
  if (!data[internal_external]) {
    data[internal_external] = {}
  }
  for (var types in node) {
    var nullCount = 0;
    for (var count in node[types]) {
      if (!data[internal_external][types]) {
        data[internal_external][types] = {}
      }
      if (data[internal_external][types][count]) {
        data[internal_external][types][count].push(node[types][count])
      } else {
        data[internal_external][types][count] = [node[types][count]]
      }
      if (node[types][count] === 0 || node[types][count] === null) {
        nullCount++;
      }
    }
  }
  return data;
}

var convertToArray = function(object) {
  var platformData = [];
  for (var report in object) { 
    for (var keys in object[report]) {
      var outerHeader = [report, keys];
      var checkArray = object[report][keys];
      var joined = [];
      if (Array.isArray(checkArray)) { //If it contains an inner array
        outerHeader.push('');
        joined = outerHeader.concat(checkArray);
        platformData.push(joined);
      } else { 
          for (var innerHeader in checkArray) {
            outerHeader = [report, keys, innerHeader];
            joined = outerHeader.concat(checkArray[innerHeader]);
            platformData.push(joined);
          }
      }
      // platformData.push(joined)
    }
  }
  // console.log(platformData)
  return platformData;
}

var deleteUnnecessaryRows = function(platform){
  var necessaryRows = [];
  var actualData = [];
  for (var i = 0; i < platform.length; i++) {
    actualData =  platform[i].slice(3)
    var count = 0;
    for (var j = 0; j < actualData.length; j++) {
      if (actualData[j] === null || actualData[j] === 0) {
        count++;
      }
    }
    if (count !== actualData.length) {
      necessaryRows.push(platform[i]);
    }
  }
  return necessaryRows
}


var generateBulkReport = function(report, timeframe) {
  var allPlatorms = {}
  for (var i = 0; i < report.length; i++) {
    var currentPlatformId = report[i][0]["client_id"]
    allPlatorms[currentPlatformId] = generateReport(report[i])
  }
  for (var platforms in allPlatorms) {
    allPlatorms[platforms] = convertToArray(allPlatorms[platforms])
  }

  for (platforms in allPlatorms) {
    allPlatorms[platforms] = deleteUnnecessaryRows(allPlatorms[platforms])
  }

  var headers = ["type", "outerscope (if applicable)", "inner_scope", "January", "February", "March"]
  for (platform in allPlatorms) {
    var platform_id = platform;
    fs.writeFile('./qbr_reports/' +platform_id + '.csv', headers + '\n', (err) => { //Creates header
      if (err) {
        return;
      }
    })
    for (var i = 0; i < allPlatorms[platform].length; i++) { 
      fs.appendFile('./qbr_reports/' + platform_id + '.csv', allPlatorms[platform][i] + '\n', (err) => { //Add report to same file 
        if (err) {
          return;
        } 
      })
    }
  }
}

client_id = [
];
timestamps =[[1577865600000, 1580500740000], [1580544000000, 1583006340000], [1583049600000, 1585638000000]]
//[1575187200000, 1577865540000],  DECEMBER
getReports(client_id, timestamps)

