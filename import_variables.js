const axios = require('axios');
const fs = require('fs').promises; // Use the promises API for fs

const variablesFile = 'variables.json';
const variablesLookupFile = 'variable_id_lookup.json';
const apiEndpoint = 'https://qteststaging2.staging.qtestnet.com/api/v3/variables';
const bearerToken = 'aa718c08-e087-4ad3-ad0c-831fc106677e';
const projectIds = [96134];  // This is an array of project IDs for which you want the configurations to appear, ex. [900, 901, 910]

async function processVariables() {
    try {
        // Read the input file
        const data = await fs.readFile(variablesFile, 'utf8');
        const variables = JSON.parse(data);

        // Create a map to group variables by variableid and variable_name
        const variableMap = new Map();

        variables.forEach(v => {
            const key = `${v.variableid}-${v.variable_name}`;
            if (!variableMap.has(key)) {
                variableMap.set(key, {
                    name: v.variable_name,
                    description: v.variable_description || v.variable_name, // uses ternary operator, shorthand for "if v.variable.description == '' then use v.variable name"
                    values: []
                });
            }
            variableMap.get(key).values.push(v.value);
        });

        // Create an array to store the mapping of old to new variable IDs
        const variableIdMapping = [];

        // Process each distinct variable
        for (let [key, variable] of variableMap) {
            const payload = {
                name: variable.name,
                description: variable.description,
                defaultValue: variable.values[0], // set default to the first value, as defaults do not exist in legacy system
                active: true,
                relatedVariables: [],
                values: variable.values,
                projectIds: projectIds
            };

            try {
                const response = await axios.post(`${apiEndpoint}`, payload, {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const newVariableId = response.data.id;
                const oldVariableId = key.split('-')[0];

                // Store the old and new variable IDs
                variableIdMapping.push({
                    oldVariableId: oldVariableId,
                    newVariableId: newVariableId
                });
            } catch (error) {
                console.error(`Error creating variable for ${key}:`, error);
            }
        }

        // Write the mapping to a file
        await fs.writeFile(variablesLookupFile, JSON.stringify(variableIdMapping, null, 4), 'utf8');
        console.log(`Variable ID mapping saved to ${variablesLookupFile}`);
    } catch (err) {
        console.error('Error processing variables:', err);
    }
}

processVariables();
