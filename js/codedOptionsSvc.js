//service to get options for coded elements.
//will cache results

angular.module("pocApp")

    .service('codedOptionsSvc', function($q,$http) {

        let nzhts = `https://nzhts.digital.health.nz/fhir/ValueSet`     //the 'default' base for the valueSet url


        //the valueset expansion cache is built dynamically - ie not persisted
        //keyed on url (from the ed )
        let cache = {}

        return {
            getVsUrl : function (url) {
                //if the url has no 'http' then add the NZ prefix
                let vsUrl = url
                if (url.indexOf('http:') == -1) {
                    vsUrl = `${nzhts}/${vsUrl}`
                }
                return vsUrl

            },
            populateCache : function (comp) {
                // go through all the ValueSets in the composiiton and populate the cache for all of them
                // idea is that this is called when the composition is loaded, then the results will be
                // available when the form is created

            },
            getOptionsForEd: function (ed) {
                // return an array of options for an ed. Options have priority over ValueSet.
                // return object {options:[],status:,vsUrl} - status is:
                //  'options' - list is from options element
                //  'vs' - list is from an expanded ValueSer
                //  'not-found' - the ValueSet was not found on the term server
                //  'no-options-or-vs' - there was neither a VS nor options
                // vsUrl is the url used against the termserver (may have been prefixed with the nzhts prefix)

                //when used by the Q builder, the caller can decide whether to use the vsUrl or answeroptions
                //  - could decide on size for example

                let deferred = $q.defer()
                let that = this

                let arOptions = []      //the returned list of options

                //do the options first. If they exist then return them (though always add a system to avoid validator complaints)..
                if (ed.options) {
                    for (const option of ed.options) {
                        let system = option.system || "http://example.com/fhir/CodeSystem/example"
                        let code = option.code || 'unknownCode'
                        code = code.replace(/\s/g,'')   //trim all whitespace
                        let display = option.display || 'Unknown display'
                        arOptions.push({code:code,system:system,display:display})
                    }
                    deferred.resolve({options:arOptions,status:'options'})
                } else if (ed.valueSet) {

                    //if there's a valueSet, then tru to expand it

                    //if it exists in the cache can just return it from the cache
                    if (cache[ed.valueSet]) {
                        //the cache contains the return object - not just the list of options
                        deferred.resolve(cache[ed.valueSet])
                        return
                    }

                    //if here, then the VS is not in the cache
                    let vsUrl = that.getVsUrl(ed.valueSet)  //may need to prefix the url

                    let qry = `ValueSet/$expand?url=${vsUrl}&_summary=false`
                    let encodedQry = encodeURIComponent(qry)
//console.log(qry)
                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let expandedVS = data.data
                            for (const concept of expandedVS.expansion.contains) {
                                arOptions.push(
                                    {system:concept.system, code:concept.code, display:concept.display})
                            }

                            let response = {options:arOptions,status:'vs',vsUrl:vsUrl}  //create the response object
                            cache[vsUrl] = response     //add to the cache
                            deferred.resolve(response)  //and return


                        }, function (err) {
                            let response = {options:arOptions,status:'not-found',vsUrl:vsUrl}  //create the response object
                            cache[vsUrl] = response     //add to the cache
                            deferred.resolve(response)  //and return
                        }
                    )


                } else {
                    //neither options nor ValueSet
                    let response = {options:arOptions,status:'no-options-or-vs'}  //create the response object
                    deferred.resolve(response)
                }

                return deferred.promise
            }

        }
    })