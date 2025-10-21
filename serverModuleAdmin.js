//Administrative functions

//let MongoClient = require('mongodb').MongoClient;


let tables = []       //an array of tables (mongo collections) that can be queried
tables.push({display:"Collections"})
tables.push({display:"Published Q"})
tables.push({display:"Components"})

const axios = require("axios");


async function setup(app,database) {



    app.get('/admin/tables' ,async function (req,res) {

        res.json(tables)

    })

    app.get('/admin/tablesss' ,async function (req,res) {

        try{
            let query={name:name,version:version}

            console.log(query)

            const cursor = await database.collection("publishedQ").find(query).toArray()
        } catch (ex) {
            res.status(500).json(ex.message)
        }

    })



}


module.exports = {
    setup : setup
};