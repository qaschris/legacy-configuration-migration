const axios = require('axios');
const fs = require('fs').promises;

const testRunsFile = 'testruns.json';
const configurationsLookupFile = 'configuration_id_lookup.json';
const apiEndpoint = 'https://qteststaging2.staging.qtestnet.com/api/v3/projects/0/test-runs/';
const bearerToken = 'aa718c08-e087-4ad3-ad0c-831fc106677e';

async function updateTestRuns() {
  try {
    // Read the test runs file
    const testRunsData = await fs.readFile(testRunsFile, 'utf8');
    const testRuns = JSON.parse(testRunsData);

    // Read the configurations lookup file
    const configurationsLookupData = await fs.readFile(configurationsLookupFile, 'utf8');
    const configurationsLookup = JSON.parse(configurationsLookupData);

    // Iterate through each test run and make API calls
    for (const testRun of testRuns) {
      const { testrunid, configurationid, configuration_name } = testRun;

      // Get the new configuration ID from the lookup file
      const newConfigurationId = configurationsLookup[configurationid];

      if (!newConfigurationId) {
        console.error(`No new ID found for configuration ID ${configurationid}`);
        continue;
      }

      const payload = {
        configurationId: newConfigurationId
      };

      try {
        const response = await axios.put(`${apiEndpoint}${testrunid}`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`
          }
        });

        console.log(`Successfully updated test run: ${testrunid} with new configuration ID: ${newConfigurationId}`);
      } catch (error) {
        console.error(`Error updating test run ${testrunid}:`, error.response ? error.response.data : error.message);
      }
    }

    console.log('Test run updates completed successfully.');

  } catch (error) {
    console.error('Error during update process:', error);
  }
}

updateTestRuns();
