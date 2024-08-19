const axios = require('axios');
const fs = require('fs').promises;

const testRunsFile = 'testruns.json';
const configurationsLookupFile = 'configuration_id_lookup.json';
const apiEndpoint = 'https://qteststaging2.staging.qtestnet.com/api/v3/projects/';
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
      const { testrunid, configurationid, projectid } = testRun;

      // Get the new configuration ID from the lookup file
      const newConfigurationId = configurationsLookup[configurationid];

      if (!newConfigurationId) {
        console.error(`No new ID found for configuration ID ${configurationid}`);
        continue;
      }

      try {
        // First, retrieve the test run information
        const testRunResponse = await axios.get(`${apiEndpoint}${projectid}/test-runs/${testrunid}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`
          }
        });

        // Log the payload prior to update for debugging
        //console.log(`Payload for test run ${testrunid}:`, JSON.stringify(testRunResponse.data, null, 2));

        // Update the payload with the new configuration ID
        const payload = {
          ...testRunResponse.data,
          configuration_id: newConfigurationId
        };

        delete payload.properties;

        // Log the payload for debugging
        //console.log(`Payload for test run ${testrunid}:`, JSON.stringify(payload, null, 2));

        // Send the updated test run data back to the API
        await axios.put(`${apiEndpoint}${projectid}/test-runs/${testrunid}`, payload, {
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
