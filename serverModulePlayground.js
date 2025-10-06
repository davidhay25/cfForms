//Playground routines
//note re-labelled as collections


let MongoClient = require('mongodb').MongoClient;
let database        //this will be the database connection




async function setup(app,mongoDbName,uri) {
    console.log("Setting up connection to mongodb in serverModulePlayground")


   // const uri = "mongodb://127.0.0.1:27017"  //local machine
    const client = new MongoClient(uri);
    database = client.db(mongoDbName)

    await client.connect()
    console.log("model connected in serverModulePlayground")

    //key is the DG name - whether from LIM or Collection
    app.get('/frozen/:name', async function(req,res) {
        let name = req.params.name

        const query = {name:name,deleted : {$ne : true}}
       // console.log(query)
        try {
            const ar =  await database.collection("frozenDG").find(query).toArray()
            if (ar.length == 1) {
                let dg = ar[0]
                delete dg['_id']
                res.json(dg)
            } else {
                if (ar.length == 0) {
                    res.status(404).json({msg:`${name} not found`})
                } else {
                    res.status(400).json({msg:`There were ${ar.length} matches for ${name}`})
                }

            }


        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    app.put('/frozen/:name', async function(req,res) {
        let name = req.params.name
        let frozen = req.body
        frozen.updated = new Date()
        delete frozen['_id']

        const query = {name:name}
        try {
            await database.collection("frozenDG").replaceOne(query,frozen,{upsert:true})

            res.json(frozen)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    app.get('/allfrozen', async function(req,res) {
        try {
            let qry = {deleted : {$ne : true}}
            const cursor = await database.collection("frozenDG").find(qry).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


    app.post('/playground/unlock',async function(req,res) {
        let vo = req.body
        const command = {'$unset':{lockedTo:""}}
        const query = {id:vo.id}
        try {
            const cursor1 = await database.collection("playground").updateOne(query,command)
            res.json(cursor1[0])
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }



    })

    //lock a playground
    app.post('/playground/lock', async function(req,res) {
        let vo = req.body
        const query = {id:vo.id}
        try {
            const cursor = await database.collection("playground").find(query).toArray()
            if (cursor.length == 1) {

                let playground = cursor[0]
                playground.lockedTo = vo.email

                const cursor1 = await database.collection("playground").replaceOne(query,playground,{upsert:true})

                res.json(cursor1[0])
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'Form not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} Forms with this id. This shouldn't happen.`})
                }

            }
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })

    //get a single playground by id
    app.get('/playground/:id', async function(req,res) {
        let id = req.params.id
        const query = {id:id}
        try {
            const cursor = await database.collection("playground").find(query).toArray()
            if (cursor.length == 1) {
                let playground = cursor[0]
                delete playground['_id']
                res.json(playground)
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'Playground not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} Playgrounds with this id. This shouldn't happen.`})
                }

            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //get a single playground by name
    app.get('/playgroundByName/:name', async function(req,res) {
        let name = req.params.name
        const query = {name:name}
        try {
            const cursor = await database.collection("playground").find(query).toArray()
            if (cursor.length == 1) {
                let playground = cursor[0]
                delete playground['_id']
                res.json(playground)
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'Playground not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} Playgrounds with this name. This shouldn't happen.`})
                }

            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


    //get the history of a playground
    app.get('/playground/history/:id', async function(req,res) {
        let id = req.params.id
        const query = {id:id}
        try {
            const cursor = await database.collection("playgroundBackup").find(query).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //get a summary of playgrounds
    app.get('/playgroundSummary', async function(req,res) {
        let publishedOnly = req.query.publishedOnly      //will only return pgs that have been published
        try {
            const cursor = await database.collection("playground").find().sort({name:1}).toArray()
            let ar = []
            for (const entry of cursor) {

                let include = true
                if (publishedOnly) {
                    if (! entry.publishedVersion) {
                        include = false
                    }
                }

                if (include) {
                    let item = {id:entry.id,name:entry.name,description:entry.description,updated:entry.updated}
                    item.version = entry.version
                    item.lockedTo = entry.lockedTo
                    item.publishedVersion =entry.publishedVersion
                    item.publishedDate =entry.publishedDate
                    if (entry.dataGroups) {
                        item.dgCount = Object.keys(entry.dataGroups).length
                    }
                    if (entry.compositions) {
                        item.compCount = Object.keys(entry.compositions).length
                    }
                    ar.push(item)
                }

            }

            try {
                ar.sort(function (a,b) {
                    if (a.name.toLowerCase() > b.name.toLowerCase()) {
                        return 1
                    } else {
                        return -1
                    }

                })
            } catch (e) {
                console.error(e)
                res.json(ar)
            }


            res.json(ar)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //create / update a single Playground. In theory the name param is not needed, but cleaner
    app.put('/playground/:id', async function(req,res) {
        let id = req.params.id
        let playground = req.body
        let playgroundBackup = JSON.parse(JSON.stringify(playground))
        delete playgroundBackup['_id']

        const query = {id:id}
        try {

            await database.collection("playgroundBackup").insertOne(playgroundBackup)     //insert into the backup collection
            const cursor = await database.collection("playground").replaceOne(query,playground,{upsert:true})

            res.json(playground)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    // -----------  versions ----------

    //save the supplied playground as a version
    //contains only DGs that are container DG's. assume the caller has inflated them

    app.post('/playgroundVersion', async function(req,res) {
        let playground = req.body
        delete playground['_id']
        let id = playground.id
        //let version = playground.publishedVersion    //assume the caller has set this correctly

        //todo if there's already an entry with this version then reject the call


        //save the version
        try {
            await database.collection("playgroundVersion").insertOne(playground)     //insert into the backup collection
            res.json({})
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //get all the versions for a playground
    app.get('/playgroundVersion/:id', async function(req,res) {
        let id = req.params.id
        const query = {id:id}
        try {
            const cursor = await database.collection("playgroundVersion").find(query).sort({publishedDate:-1}).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


}



module.exports = {
    setup : setup
};