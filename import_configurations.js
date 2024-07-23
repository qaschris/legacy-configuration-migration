const axios = require('axios');
const fs = require('fs').promises;

const configurationsFile = 'configurations.json';
const variablesLookupFile = 'variable_id_lookup.json';
const configurationsOutputFile = 'configurations_with_new_ids.json';
const configurationsLookupFile = 'configuration_id_lookup.json';
const apiEndpoint = 'https://qteststaging2.staging.qtestnet.com/api/v3/configurations';
const bearerToken = 'aa718c08-e087-4ad3-ad0c-831fc106677e';

async function importConfigurations() {
  try {
    // Read the configurations file
    const configurationsData = await fs.readFile(configurationsFile, 'utf8');
    const configurations = JSON.parse(configurationsData);

    // Read the variables lookup file
    const variablesLookupData = await fs.readFile(variablesLookupFile, 'utf8');
    const variablesLookup = JSON.parse(variablesLookupData);

    const configurationsLookup = {};

    // Iterate through each configuration and make API calls
    for (const configuration of configurations) {
      const {
        configurationid,
        configuration_name,
        variableid,
        variable_name,
        valueid,
        variable_value
      } = configuration;

      // Get the new variable ID from the lookup file
      const newVariableId = variablesLookup[variableid]?.newVariableId;

      if (!newVariableId) {
        console.error(`No new ID found for variable ID ${variableid}`);
        continue;
      }

      const payload = {
        name: configuration_name,
        description: configuration_name,
        active: true,
        variables: [
          {
            id: newVariableId,
            value: variable_value
          }
        ],
        projectIds: [0]
      };

      try {
        const response = await axios.post(apiEndpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`
          }
        });

        const newConfigurationId = response.data.id;
        configurationsLookup[configurationid] = newConfigurationId;

        // Update the original configurations array with the new ID
        configuration.new_configurationid = newConfigurationId;

        console.log(`Successfully created configuration: ${configuration_name} with new ID: ${newConfigurationId}`);
      } catch (error) {
        console.error(`Error creating configuration ${configuration_name}:`, error.response ? error.response.data : error.message);
        console.error(JSON.stringify(payload));
      }
    }

    // Write the updated configurations to the output file
    await fs.writeFile(configurationsOutputFile, JSON.stringify(configurations, null, 4), 'utf8');

    // Write the configurations lookup file
    await fs.writeFile(configurationsLookupFile, JSON.stringify(configurationsLookup, null, 4), 'utf8');

    console.log('Import and lookup generation completed successfully.');

  } catch (error) {
    console.error('Error during import process:', error);
  }
}

importConfigurations();
