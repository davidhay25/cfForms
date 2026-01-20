//server routines to interact with Form Managers (FHIR server with Q resources



const axios = require("axios");

/**
 * Fetch all FHIR resources with arbitrary search criteria and optional _elements filtering, following paging.
 * @param {string} baseUrl - FHIR resource endpoint (e.g., https://server/fhir/Questionnaire)
 * @param {object} searchParams - Key-value pairs for search (e.g., { title: "myform", status: "active", _count: 50 })
 * @param {string[]} elements - Optional array of element names to fetch (e.g., ["id","title","status"])
 * @param {object} axiosConfig - Optional Axios config (headers, auth)
 * @returns {Promise<Array>} - Array of all matching resources
 */
async function fetchAllFHIR(baseUrl,searchParams = {}, elements = [],axiosConfig,maxResults) {
    let allResources = [];


    // Build initial URL with search parameters and optional _elements
    const buildUrl = (base, params, elements) => {
        const url = new URL(base);
        Object.entries(params).forEach(([key, value]) => {
            if (typeof value === 'string') value = value.trim();
            url.searchParams.append(key, value);
        });

        if (elements.length) {
            url.searchParams.append("_elements", elements.join(","));
        }
        return url.toString();
    };

    let nextUrl = buildUrl(baseUrl, searchParams, elements);
    let msg

    try {
        while (nextUrl) {
            console.log(nextUrl)
            const response = await axios.get(nextUrl);
            const bundle = response.data;

            if (!bundle || !bundle.entry) break;

            allResources.push(...bundle.entry.map(e => e.resource));


            // Get the next page URL if available
            const nextLink = bundle.link?.find(l => l.relation === "next");


            nextUrl = nextLink?.url || null;
            if (allResources.length > maxResults) {
                msg = `Maximum of ${maxResults} met or exceeded.`
                nextUrl = null
            }

        }

        return {allResources:allResources,msg:msg}
    } catch (err) {
        //console.error("Error fetching FHIR data:", err);
        throw err;
    }
}




async function setup(app) {

    //retrieve a single Q from a forms server by url & version
    //if an id id supplied then it s retrieved directly
    //otherwise params server, url & version are required
    app.get('/formManager', async function(req,res) {
        let server = req.query['server']
        let url = req.query['url']
        let version = req.query['version']
        let id = req.query['id']
        if (id) {
            let query = `${server}/Questionnaire/${id}`
            const response = await axios.get(query)
            res.json(response.data)
        } else {
            if (! server || !url || ! version) {
                res.status(400).json({msg:"server, url & version are required"})
                return
            }

            let query = `${server}/Questionnaire?url=${url}&version=${version}`
            console.log(query)

            const response = await axios.get(query)
            let bundle = response.data
            let resource = bundle.entry?.[0].resource

            res.json(resource)

        }







    })

    //query the FHIR server with the url in the 'server' parameter (required
    //other query parameters will be added as fhir search params
    app.get('/formManagerSearch', async function(req,res) {

        let params = req.query
        let baseUrl
        let newParams = {}
        Object.entries(params).forEach(([key, value]) => {
            if (key == 'server') {
                baseUrl = `${value.trim()}/Questionnaire`
            } else {
                newParams[key] = value
            }
        });

        if (! baseUrl) {
            res.status(400).json({msg:"Server not specified"})
            return
        }


        const elements = [] //"id", "title", "url"]; // Only fetch these fields

        const headers = { Accept: "application/fhir+json" };

        //
        const results = await fetchAllFHIR(baseUrl,newParams, elements, { headers },100);

        res.json(results)

    })
}


module.exports = {
    setup : setup
};