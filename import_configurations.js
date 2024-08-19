const axios = require('axios');
const fs = require('fs').promises;

const configurationsFile = 'configurations.json';
const variablesLookupFile = 'variable_id_lookup.json';
const configurationsLookupFile = 'configuration_id_lookup.json';
const apiEndpoint = 'https://qteststaging2.staging.qtestnet.com/api/v3/configurations';
const bearerToken = 'aa718c08-e087-4ad3-ad0c-831fc106677e';
const projectIds = [96134];  // This is an array of project IDs for which you want the configurations to appear, ex. [900, 901, 910]

// Function to rest in between API calls to avoid the limiter
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to find the new variable ID based on the old variable ID
function findNewVariableId(variablesLookup, oldVariableId) {
    const match = variablesLookup.find(v => v.oldVariableId === oldVariableId);
    return match ? match.newVariableId : null;
}

async function importConfigurations() {
  try {
    // Read the configurations file
    const configurationsData = await fs.readFile(configurationsFile, 'utf8');
    const configurations = JSON.parse(configurationsData);

    // Read the variables lookup file
    const variablesLookupData = await fs.readFile(variablesLookupFile, 'utf8');
    const variablesLookup = JSON.parse(variablesLookupData);

    const configurationsLookup = {};

    // Group configurations by name and collect their variables
    const groupedConfigurations = configurations.reduce((acc, configuration) => {
      const {
        configurationid,
        configuration_name,
        variableid,
        variable_name,
        valueid,
        variable_value
      } = configuration;

      // Get the new variable ID from the lookup file
      const newVariableId = findNewVariableId(variablesLookup, variableid);

      if (!newVariableId) {
        console.error(`No new ID found for variable ID ${variableid}`);
        return acc;
      }

      if (!acc[configuration_name]) {
        acc[configuration_name] = {
          name: configuration_name,
          description: configuration_name,
          active: true,
          variables: [],
          projectIds: projectIds,
          originalIds: []
        };
      }

      acc[configuration_name].variables.push({
        id: newVariableId,
        value: variable_value
      });

      acc[configuration_name].originalIds.push(configurationid);

      return acc;
    }, {});

    // Make API calls for each grouped configuration
    for (const [name, payload] of Object.entries(groupedConfigurations)) {
      try {
        const response = await axios.post(apiEndpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`
          }
        });

        const newConfigurationId = response.data.id;

        payload.originalIds.forEach(originalId => {
          configurationsLookup[originalId] = newConfigurationId;
        });

        console.log(`Successfully created configuration: ${name} with new ID: ${newConfigurationId}`);
      } catch (error) {
        console.error(`Error creating configuration ${name}:`, error.response ? error.response.data : error.message);
        console.error(JSON.stringify(payload));
      }

      await sleep(500); // Sleep for defined milliseconds between calls (adjust time as needed)
    }

    // Write the configurations lookup file
    await fs.writeFile(configurationsLookupFile, JSON.stringify(configurationsLookup, null, 4), 'utf8');

    console.log('Import and lookup generation completed successfully.');

  } catch (error) {
    console.error('Error during import process:', error);
  }
}

importConfigurations();
