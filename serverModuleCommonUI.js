/*
*
* These are all endpoints that support the Lab application. They are generally not FHIR compliant as they serve the local application
*/
const axios = require("axios");
const showLog = true
let db





//let serverBase = utilModule.checkUrlSlash(process.env.SERVERBASE)
let serverBase = process.env.SERVERBASE

//a cache of Questionnaire resources. todo - make version aware
//used by makeVoFromQR
let QCache = {}


//todo ? copy from pocServer
async function multiQuery(lst) {

}

//execute a single query, following paging.
//If the query does not begin with 'http', then execute agains the POC fhir server
async function singleQuery(query) {

    let qry = query
    if (! query.startsWith('http')) {
        qry = serverBase + query
    }

    //add the count if it's not already there, and the query is not a history one...
    if (qry.indexOf('_count') == -1 && qry.indexOf('_history') == 1) {
        qry += "&_count=50"
    }

    let bundle

    console.log('qry=',qry)
    let config = {headers:{'cache-control':'no-cache'}}     //otherwise the hapi server will cache for a minute

    try {
        let response = await axios.get(qry,config)
        let ctr = 0
         bundle = response.data       //the first bundle

        console.log(ctr++,bundle.entry.length)

        let nextPageUrl = getNextPageUrl(bundle)

        while (nextPageUrl) {
            let nextResponse = await axios.get(nextPageUrl,config)
            let nextBundle = nextResponse.data
            if (nextBundle.entry) {
                nextBundle.entry.forEach(function (entry) {
                    bundle.entry.push(entry)
                })
            }
            console.log(ctr++,nextBundle.entry.length)
            nextPageUrl = getNextPageUrl(nextBundle)
            //console.log(nextPageUrl)
        }
        bundle.total = 0
        if (bundle.entry) {
            bundle.total = bundle.entry.length
        }


         return bundle
    } catch (ex) {
        if (ex.response) {
            if (ex.response.status == 404) {
                //if it's a 404 then just return an empty bundle
                return {responseType:"Bundle"}
            } else {
                //the cli hapi server has a problem with paging. This can return to being thrown when I stop using that...
                return bundle
                //throw (ex)
            }


        } else {
            return bundle
            //throw (ex)

        }

    }


}


function getNextPageUrl(bundle) {
    //console.log('gm' + bundle.resourceType)
    let url = null
    if (bundle && bundle.link) {
        bundle.link.forEach(function (link){
            if (link.relation == 'next') {
                url = link.url
            }
        })
    }
    //console.log('next',url)
    return url

}

async function  makeVoFromQR(QR) {
    //construct a value object from the coded answers in the QR
    //right now it's a simple name/value combo - later maybe we can maintainn the structure
    //let clone = angular.copy(QR)    //we'll add the code to this QR
    let questionnaireUrl = QR.questionnaire
    if (!questionnaireUrl ){
        return {success:false,msg:"Missing questionnaire element in QR"}
    }
    //now get the Q
    let Q = QCache[questionnaireUrl]
    if (! Q) {
        //retrieve the Q from the forms server and place in cache
        let qry = `Questionnaire?url=${questionnaireUrl}`
        let bundle = await singleQuery(qry)
        if (bundle.entry.length > 0) {
            Q = bundle.entry[0].resource
            QCache[questionnaireUrl] = Q
        } else {
            return {success:false,msg:`A questionnaire with the url ${questionnaireUrl} was not found`}
        }

    }

    //now we have a Q, construct a hash of codes by linkId. Contains the Coding for that linkId
    let hashCodes = {}
    Q.item.forEach(function (section) {
        getCodedItem(section)
    })

    //Finally, we can iterate through the QR.
    let hashAnswers = {}  //keyed on system|code
    QR.item.forEach(function (section) {
        processQRItem(section,section)
    })

    return {answers : hashAnswers}


    //process an item from the QR. If it has an answer (and there should be), and there is a matching code in the hash (from the Q) then add to hashAnswers
    function processQRItem(item,section) {
        let codes = hashCodes[item.linkId]

        //console.log('a',item.linkId,codes)

        if (codes) {
            //there is a matching code (array of Coding) for this linkId
            //add all the codings to the vo. Generally there will only be 1...
            codes.forEach(function (coding) {
                let key = `${coding.system}|${coding.code}`
                item.answer.forEach(function (ans) {
                    //console.log(ans)
                    hashAnswers[key] = hashAnswers[key] || {answers:[]}
                    hashAnswers[key].answers.push({answer:ans,linkId:item.linkId,text:item.text,section:section.text})       //will be something like valueCoding
                })
            })

        }

        if (item.item) {
            item.item.forEach(function (child) {
                processQRItem(child,section)
            })
        }




    }

    //gets a coded item from the Q
    function getCodedItem(item) {
        if (item.code) {
            hashCodes[item.linkId] = item.code       //an array of codings
        }
        if (item.item) {
            item.item.forEach(function (child) {
                getCodedItem(child)
            })
        }
    }

}

//find all Q using a given valueset. todo: cache in some way as computationally expensive
async function findQusingVS(vsUrl) {
    console.log('vs url',vsUrl)
    let qry = "Questionnaire"
    let currentQUrl     //
    let bundle = await this.singleQuery(qry)
    let hashQ = {}   //the hash of Q where the VS is used - key url,  {url: item:[{linkId: text:]}

    bundle.entry.forEach(function (entry) {

        let Q = entry.resource
        currentQ = Q     //set the url of the Q being examined
        Q.item.forEach(function (section) {
            processItem(section)
        })
    })

    return hashQ

    function processItem(item) {
        if (item.answerValueSet){
            console.log(item.answerValueSet,vsUrl)
        }


        if (item.answerValueSet && item.answerValueSet == vsUrl) {
            console.log('hit')
            hashQ[currentQ.url] = hashQ[currentQ.ur] || {Q:currentQ,items:[]}
            hashQ[currentQ.url].items.push({linkId:item.linkId, text:item.text})
        }

        if (item.item) {
            item.item.forEach(function (child) {
                processItem(child)
            })
        }
    }

}

module.exports = {
    multiQuery : multiQuery,
    singleQuery : singleQuery,
    makeVoFromQR : makeVoFromQR,
    findQusingVS : findQusingVS
};