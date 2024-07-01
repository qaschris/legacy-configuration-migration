const { Pool } = require('pg');
const fs = require('fs').promises; // Use the promises API for fs

// Configure the database connection
const pool = new Pool({
  user: 'qtestadmin',
  host: 'localhost',
  database: 'qTest',
  password: 'qtestadmin',
  port: 5432, // Default PostgreSQL port
});

// Function to run multiple queries sequentially
async function runQueries() {
  try {
    // Query 1
    const query1 = `
      SELECT cv.id AS "variableid", cv.name AS "variable_name",
             COALESCE(NULLIF(TRIM(cv.description), ''), cv.name) AS "variable_description",
             cvv.id AS "valueid", cvv.value
      FROM configuration_variables cv
      INNER JOIN configuration_variable_values cvv ON cv.id = cvv.variableid
    `;
    console.log('Executing Query 1:', query1);
    const res1 = await pool.query(query1);
    console.log('variables:', res1.rows.length, res1.rows);
    await writeToFile('variables.json', JSON.stringify(res1.rows, null, 4));

    // Query 2
    const query2 = `
      SELECT c.id AS "configurationid", c.name AS "configuration_name",
             cv2.id AS "variableid", cv2.name AS "variable_name",
             cv1.valueid, cvv.value AS "variable_value"
      FROM configurations c
      INNER JOIN configuration_values cv1 ON c.id = cv1.configurationid
      INNER JOIN configuration_variable_values cvv ON cv1.valueid = cvv.id
      INNER JOIN configuration_variables cv2 ON cvv.variableid = cv2.id
    `;
    console.log('Executing Query 2:', query2);
    const res2 = await pool.query(query2);
    console.log('configurations:', res2.rows.length, res2.rows);
    await writeToFile('configurations.json', JSON.stringify(res2.rows, null, 4));

    // Query 3
    const query3 = `
      SELECT tcr.id AS "testrunid", tcr.name AS "testrun_name",
             c.id AS "configurationid", c.name AS "configuration_name"
      FROM test_case_run tcr
      INNER JOIN configurations c ON c.id = tcr.configurationid
      WHERE tcr.configurationid IS NOT NULL
    `;
    console.log('Executing Query 3:', query3);
    const res3 = await pool.query(query3);
    console.log('testruns:', res3.rows.length, res3.rows);
    await writeToFile('testruns.json', JSON.stringify(res3.rows, null, 4));

  } catch (err) {
    console.error('Error executing query: ', err);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Function to write data to a JSON file
async function writeToFile(filename, data) {
  try {
    await fs.writeFile(filename, data, 'utf8');
  } catch (err) {
    console.error(`Error writing to file ${filename}`, err);
  }
}

runQueries();
