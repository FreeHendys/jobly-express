"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  static async findSome(filters) {
    console.log(filters)
    let minEmployees = filters.minEmployees;
    let maxEmployees = filters.maxEmployees;
    let nameLike = filters.nameLike;
    //If Name Like is a real value, add % around it for like comparison
    if(nameLike){
      nameLike = "%" + filters.nameLike + "%";
    }

    if(parseInt(minEmployees) > parseInt(maxEmployees)){
      let error = new ExpressError("Minimum employees must be less (<) than Maximum Employees!!", 400);
      return (error);
    }
    
    console.log(minEmployees, maxEmployees, nameLike)

    /**
     * All of these queries are testing whether variables are real or not, then applying a different query
     * based on that information.
     */

    if(!maxEmployees & !nameLike){
      console.log(`made it into !maxEmployees and !nameLike`)
      const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
         FROM companies
         WHERE num_employees >= $1 
         ORDER BY name`, [minEmployees]);
        console.log(`Companies.Rows ${companiesRes.rows}`)
        return companiesRes.rows;
    }

    if(!maxEmployees & !minEmployees){
      console.log(`made it into !maxEmployees and !minEmployees`)
      const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
         FROM companies
         WHERE name LIKE $1 
         ORDER BY name`, [nameLike]);
        console.log(`Companies.Rows ${companiesRes.rows}`)
        return companiesRes.rows;
    }

    if(!minEmployees & !nameLike){
      console.log(`made it into !minEmployees and !nameLike`)
      const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
         FROM companies
         WHERE num_employees <= $1
         ORDER BY name`, [maxEmployees]);
        console.log(`Companies.Rows ${companiesRes.rows}`)
        return companiesRes.rows;
    }


    if(!minEmployees){
      console.log(`made it into !minEmployees`)
      const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
         FROM companies
         WHERE name LIKE $2 
         AND num_employees <= $1
         ORDER BY name`, [maxEmployees, nameLike]);
        console.log(`Companies.Rows ${companiesRes.rows}`)
        return companiesRes.rows;
    }

    if(!maxEmployees){
      console.log(`made it into !maxEmployees`)
      const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
         FROM companies
         WHERE name LIKE $2 
         AND num_employees >= $1 
         ORDER BY name`, [minEmployees, nameLike]);
        console.log(`Companies.Rows ${companiesRes.rows}`)
        return companiesRes.rows;
    }

    if(!nameLike){
      console.log(`made it into !nameLike`)
      const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
         FROM companies
         WHERE num_employees >= $1 
         AND num_employees <= $2
         ORDER BY name`, [minEmployees, maxEmployees]);
        console.log(`Companies.Rows ${companiesRes.rows}`)
        return companiesRes.rows;
    }

    else {
      console.log(`made it into all filters present`)
      const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
         FROM companies
         WHERE name LIKE $3 
         AND num_employees >= $1 
         AND num_employees <= $2
         ORDER BY name`, [minEmployees, maxEmployees, nameLike]);
        console.log(`Companies.Rows ${companiesRes.rows}`)
        return companiesRes.rows;
    }
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
