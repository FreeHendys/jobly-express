const { BadRequestError } = require("../expressError");

/**
 * SQL Update function creator.
 * 
 * This function is used to make SET clauses of UPDATE statements
 * 
 * 
 * @param {*} dataToUpdate  {Object} {Field1: updatedValue, Field2: updatedValue}
 * @param {*} jsToSql {Object} maps javascript data object fields to database column names
 *            ex: {firstName: "first_name", age: "age"}
 * 
 * @returns {Object} {sqlSetCols, dataToUpdate}
 * 
 * @example {firstName: 'Brenda', age: 66} => 
 *    {setCols: '"first_name=$1", "age"=$2', values: ['Brenda', 66]}
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
