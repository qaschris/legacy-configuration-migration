const axios = require('axios');
const fs = require('fs').promises; // Use the promises API for fs

const variablesFile = 'variables.json';
const variablesLookupFile = 'variable_id_lookup.json';
const bearerToken = 'aa718c08-e087-4ad3-ad0c-831fc106677e';
const apiEndpoint = 'https://qteststaging2.staging.qtestnet.com/api/v3/variables';

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
                    description: v.variable_description,
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
                active: true,
                relatedVariables: [],
                values: variable.values,
                projectIds: [0]
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
