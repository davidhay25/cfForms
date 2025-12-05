//Administrative functions

const { ObjectId } = require('mongodb');
const axios = require("axios");

let tables = []       //an array of tables (mongo collections) that can be queried
tables.push({display:"Collections",col:'playground',summaryFields:['name','description','publishedVersion']})
tables.push({display:"Components",col:'frozenDG',summaryFields:['name','updated']})
//tables.push({display:"Generated Q",col:'questionnaire',summaryFields:['Q.name','Q.description']})
tables.push({display:"Published Q",col:'publishedQ',
    sort: {name:1,version:-1},
    summaryFields:['name','title','version','date']})



//create a hash keyed on col
let hashTables = {}
for (const table of tables) {
    hashTables[table.col] = table
}




async function setup(app,database,client) {
    //return a list of the tables (mongo collections) than can be examined

    app.get('/admin/databases', async function(req,res){
        const adminDb = client.db().admin();
        const result = await adminDb.listDatabases();
        let lstDb = []

        result.databases.forEach(db => lstDb.push({name:db.name}));
        res.json(lstDb)
    })

    app.get('/admin/tables' ,async function (req,res) {


        //  const exactCount = await collection.countDocuments({ active: true });
        let ar = []
        for (let tbl of tables) {
            tbl.length = await database.collection(tbl.col).countDocuments()
        }

        res.json(tables)

    })

    //return a single table summary
    app.get('/admin/table/:col' ,async function (req,res) {

        let collection = req.params.col
        let table = hashTables[collection]
        let filter = {}
        let sort = {"name":"1"} //default sort by name

        if (req.query.filter) {

            try {
                filter = JSON.parse(decodeURIComponent(req.query.filter))
            } catch (ex) {
                res.status(400).json(`invalid filter: ${req.query.filter}`)
                return
            }
        }

        if (req.query.sort) {

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

    app.post('/admin/updateFromProd', async function (req,res) {
        //let qry = `http://canshare.co.nz/admin/getBackup`
        let qry = `https://canshare.co.nz/forms/admin/getBackup`   //just for testing
        try {
            let result = await axios.get(qry)
            //console.log(result.data)
            let log = await updateFromExtract(result.data)
            res.json({msg:"Update complete.",log:log})
        } catch (ex) {
            res.status(500).json({msg:ex.message})
        }


    })

    app.post('/admin/restoreFromExtract', async function (req,res) {
        let data = req.body
        try {
            let log = await updateFromExtract(data)
            res.json({msg:"Update complete.",log:log})
        } catch (ex) {
            res.status(500).json({msg:ex.message})
        }

    })


    //update the local database from an extract file
    //await db.collection('users').createIndex({ id: 1 }, { unique: true }); - todo create the index
    async function updateFromExtract(extract) {
        let log = []
        for (const table of tables) {
            let collectionName = table.col      //the collection in the mongoDb to udpate
            let docs = extract[collectionName]
            if (docs && docs.length > 0) {
                for (let doc of docs ) {
                    delete doc['_id']
                    let result = null
                    let display = ""
                    switch (collectionName) {
                        case "frozenDG":
                        case "playground":  //- deliberate -
                            display = doc.name
                             result = await database.collection(collectionName).replaceOne(
                                { id: doc.id },  // filter based on your custom id
                                doc,             // full replacement document
                                { upsert: true } // insert if not found
                            )
                            break
                        case "publishedQ" :
                            display = `${doc.name} v${doc.version} `
                            result = await database.collection(collectionName).replaceOne(
                                { name: doc.name,version : doc.version },  // filter based on your custom id
                                doc,             // full replacement document
                                { upsert: true } // insert if not found
                            )
                            break
                        default :
                            display = doc.name
                            log.push({kind:table.display,table:table.col,display:display,id:doc.id,action : "Ignored"})
                            break


                    }
                    if (result) {
                        //if there's no result, the no db activity occurred...
                        let action = "Updated"
                        if (result.upsertedCount > 0) {
                            action = "Inserted"
                        }
                        log.push({kind:table.display,table:table.col,display:display,id:doc.id,action : action})
                    }


                }
            }
        }
        return log
    }

}


module.exports = {
    setup : setup
};