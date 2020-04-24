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
  // console.log(allReports)
  generateBulkReport(allReports)
}

var generateReport = function(reports) {
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
    var interchange_report = reports[i]["interchange_report"];
    user_and_report_count(user_permissions, "user_permissions", data)
    user_and_report_count(rdc_report, "rdc_report", data)
    user_and_report_count(interchange_report, "interchange_report", data)
    user_and_report_count(user_flags, "user", data)
    user_and_report_count(checking_subnets, "checking_subnets", data)
    user_and_report_count(debit_card_subnets, "debit_card_subets", data);
    amount_count(transactions, "transactions", data)
    amount_count(internal_nodes, "internal_nodes", data)
    amount_count(external_nodes, "external_nodes", data)
    amount_count(balances, "balances", data)
  }
  return data;
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
  if (data[type]["total_users"]) {
    data[type]["total_users"].push(totalUsers)
  } else {
    data[type]["total_users"] = [totalUsers]
  }
  return data;
}

var amount_count = function(node, internal_external, data) { //Iterating through nested objects
  if (!data[internal_external]) {
    data[internal_external] = {}
  }
  for (var types in node) {
    for (var count in node[types]) {
      if (!data[internal_external][types]) {
        data[internal_external][types] = {}
      }

      if (data[internal_external][types][count]) {
        data[internal_external][types][count].push(node[types][count])
      } else {
        data[internal_external][types][count] = [node[types][count]]
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
        outerHeader.push('')
        joined = outerHeader.concat(checkArray)
      } else { //There's an extra object and we need to convert the dat to an array
        for (var innerHeader in checkArray) {
          outerHeader = [report, keys, innerHeader]
          joined = outerHeader.concat(checkArray[innerHeader])
        }
      }
      platformData.push(joined)
    }
  }
  return platformData;
}

var generateBulkReport = function(report) {
  var allPlatorms = {}
  // console.log(report)
  for (var i = 0; i < report.length; i++) {
    var currentPlatformId = report[i][0]["client_id"]
    allPlatorms[currentPlatformId] = generateReport(report[i])
  }
  for (platforms in allPlatorms) {
    allPlatorms[platforms] = convertToArray(allPlatorms[platforms])
  }
  var headers = ["type", "outerscope (if applicable)", "inner_scope", "January", "February", "March"]
  for (var platform in allPlatorms) {
    var platform_id = platform;
    fs.writeFile(platform_id + '.csv', headers + '\n', (err) => { //Creates header
      if (err) {
        return;
      }
    })
    for (var i = 0; i < allPlatorms[platform].length; i++) { 
      fs.appendFile(platform_id + '.csv', allPlatorms[platform][i] + '\n', (err) => { //Add report to same file 
        if (err) {
          return;
        } 
      })
    }
  }
}

// generateBulkReport(report.report)

client_id = ["5c803a7260e6d4002ccfb16e"];
timestamps =[ [1575187200000, 1577865600000]]

getReports(client_id, timestamps)

