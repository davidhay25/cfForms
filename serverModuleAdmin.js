//Administrative functions

const { ObjectId } = require('mongodb');

let tables = []       //an array of tables (mongo collections) that can be queried
tables.push({display:"Collections",col:'playground',summaryFields:['name','description','publishedVersion']})
//tables.push({display:"Generated Q",col:'questionnaire',summaryFields:['Q.name','Q.description']})
tables.push({display:"Published Q",col:'publishedQ',
    sort: {name:1,version:-1},
    summaryFields:['name','title','version','date']})
tables.push({display:"Components",col:'frozenDG',summaryFields:['name','updated']})


//create a hash keyed on col
let hashTables = {}
for (const table of tables) {
    hashTables[table.col] = table
}

const axios = require("axios");


async function setup(app,database) {
    //return a list of the tables (mongo collections) than can be examined
    app.get('/admin/tables' ,async function (req,res) {

        res.json(tables)

    })

    //return a single table summary
    app.get('/admin/table/:col' ,async function (req,res) {

        let collection = req.params.col
        let table = hashTables[collection]
        let filter = {}
        let sort = {}
        if (req.query.filter) {
            console.log(req.query.filter)
            try {
                filter = JSON.parse(decodeURIComponent(req.query.filter))
            } catch (ex) {
                res.status(400).json(`invalid filter: ${req.query.filter}`)
                return
            }
        }

        if (req.query.sort) {
            console.log(req.query.filter)
            try {
                sort = JSON.parse(decodeURIComponent(req.query.sort))
            } catch (ex) {
                res.status(400).json(`invalid filter: ${req.query.sort}`)
                return
            }
        }

        if (table) {

            //create the projection
            let projection = {}
            //projection['_id'] = 0
            for (const field of table.summaryFields) {
                projection[field] = 1
            }

            const results = await database.collection(collection).find(filter,{projection:projection}).sort(sort).toArray()




            res.json(results)


        } else {
            res.status(400).json(`unknown table: ${collection}`)
        }



    })


    //return a single record
    app.get('/admin/record/:col/:id' ,async function (req,res) {


        let collection = req.params.col
        let id = req.params.id
        const result = await database.collection(collection).findOne({_id: new ObjectId(id)})
        res.json(result)

    })

    //return all contents of the db as a single json file.
    app.get('/admin/getbackup' ,async function (req,res) {
        //const collections = await database.listCollections().toArray();

        const collections = ['frozenDG','playground','publishedQ']
        const exportData = {};
        try {
            for (const col of collections) {
                const docs = await database.collection(col).find({}).toArray();
                exportData[col] = docs;
            }
            res.json(exportData)
        } catch (ex) {
            res.status(500).json({msg:ex.message})
        }



    })

}


module.exports = {
    setup : setup
};