## This repo is intended to generate QBR reports for platforms 

# To Run 
  1. npm install 
  2. Create a file called config.json in the same folder as this repo and put in your client credentials in the same format as this json: 
    {
      "oauth" : "admin_oauth",
      "fingerprint" : "fingerprint",
      "url" : "url"
    }
  3. Create array of clientId's, and timestamps (timestamps as a tuple with lte and gte times in epoch milliseconds) 
  4. node generate_report 

Note: getReports is currently commented out and it pulls data from the sampleData.json file to generate the data using generateBulkReport.
