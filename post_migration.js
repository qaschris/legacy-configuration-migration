const axios = require('axios');
const fs = require('fs').promises;

const configurationsLookupFile = 'configuration_id_lookup.json';
const testRunsFile = 'testruns.json';
const projectId = '138'; // the qTest project ID
const apiEndpoint = `https://qteststaging2.staging.qtestnet.com/api/v3/projects/${projectId}`;
const bearerToken = 'aa718c08-e087-4ad3-ad0c-831fc106677e';

// Function to rest in between API calls to avoid the limiter
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function postMigrationScript() {
    try {
      // Step 1: Make a GET request to fetch all configurations for the project
      const configResponse = await axios.get(`${apiEndpoint}/configurations`, {
        headers: { 'Authorization': `Bearer ${bearerToken}` }
      });
      const configurations = configResponse.data;
  
      // Step 2: Search for specific configuration names
      const targetConfigs = ['Config1', 'Config2', 'Config3'];
      const newConfigNames = ['E2E TL10', 'E2E TL8', 'PAL'];
      const configMap = {};
  
      for (let i = 0; i < targetConfigs.length; i++) {
        const config = configurations.find(c => c.name === targetConfigs[i]);
        if (!config) {
          console.error(`Configuration with name ${targetConfigs[i]} not found.`);
          continue;
        }
  
        // Step 3: Get the old configuration ID
        const configurationsLookupData = await fs.readFile(configurationsLookupFile, 'utf8');
        const configurationsLookup = JSON.parse(configurationsLookupData);
        const oldConfigurationId = Object.keys(configurationsLookup).find(key => configurationsLookup[key] === config.id);
  
        if (!oldConfigurationId) {
          console.error(`Old configuration ID not found for ${targetConfigs[i]}.`);
          continue;
        }
  
        // Step 4: Replicate the configuration with a new name
        const newConfigPayload = {
          ...config,
          name: newConfigNames[i]
        };
        delete newConfigPayload.id; // Remove ID for replication
  
        const newConfigResponse = await axios.post(`${apiEndpoint}/configurations`, newConfigPayload, {
          headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' }
        });
  
        const newConfigurationId = newConfigResponse.data.id;
        configMap[oldConfigurationId] = newConfigurationId;
        
        console.log(JSON.stringify(configMap));
  
        console.log(`Successfully replicated configuration ${targetConfigs[i]} as ${newConfigNames[i]} with new ID: ${newConfigurationId}`);
      }
  
      // Step 5: Update test runs with the new configuration IDs
      const testRunsData = await fs.readFile(testRunsFile, 'utf8');
      const testRuns = JSON.parse(testRunsData);
  
      for (const testRun of testRuns) {
        const { testrunid, configurationid, projectid } = testRun;
  
        // Only update test runs for the correct project ID
        if (projectid === projectId && configMap[configurationid]) {
          // Step 6: Update the test run with the new configuration ID
          const updatedTestRunPayload = {
            ...testRun,
            configuration_id: configMap[configurationid]
          };
  
          delete updatedTestRunPayload.properties;
  
          try {
            await axios.put(`${apiEndpoint}/test-runs/${testrunid}`, updatedTestRunPayload, {
              headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' }
            });
  
            console.log(`Successfully updated test run ${testrunid} with new configuration ID: ${configMap[configurationid]}`);
  
            await sleep(500); // Sleep for defined milliseconds between calls (adjust time as needed)
          } catch (error) {
            console.error(`Error updating test run ${testrunid}:`, error.response ? error.response.data : error.message);
          }
        }
      }
  
      console.log('Post-migration script completed successfully.');
    } catch (error) {
      console.error('Error during post-migration process:', error);
    }
  }
  
  postMigrationScript();
