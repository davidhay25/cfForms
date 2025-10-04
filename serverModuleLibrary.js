//For server side library functions like backup


const axios = require("axios");


let serverBase = "http://test.canshare.co.nz:8080/fhir/"
async function setup(app) {


    //backup from test to local.
    app.post('/library/backupTestToLocal',async function(req,res) {
        const source = "http://test.canshare.co.nz"
        const target = "http://localhost:9500"
        try {
            await performCopy(source,target)
            res.json()
        } catch (ex) {
            res.status(500).json({msg:ex.msg})
        }

    })

    //backup from prod to test via API
    app.post('/library/backupProdToTest',async function(req,res) {

        const source = "http://poc.canshare.co.nz"
        const target = "http://test.canshare.co.nz"

        try {
            await performCopy(source,target)
            res.json()
        } catch (ex) {
            res.status(500).json({msg:ex.msg})
        }


    })



    //perform the actual backup
    async function performCopy(source,target) {
        //-------------  datagroups
        console.log(source,target);

        //return

        let qry = `${source}/model/allDG`
        let response = await axios.get(qry)

        let allDg = response.data
        let config = {headers:{'x-user-email': 'uploadscript.dummy.com'}}

        for (const dg of allDg) {
            let updateQry = `${target}/model/DG/${dg.name}`
            //errors bubble up to caller
            await axios.put(updateQry,dg,config)
        }


        //compositions
        let qryComp = `${source}/model/allCompositions`

        let responseComp = await axios.get(qryComp)

        let allCompositions = responseComp.data //JSON.parse(response.data)
        //let config = {headers:{'x-user-email': 'uploadscript.dummy.com'}}

        for (const comp of allCompositions) {
            let updateQry = `${target}/model/comp/${comp.name}`
            //errors bubble up to caller
            await axios.put(updateQry,comp,config)
        }
    }



}


module.exports = {
    setup : setup
};