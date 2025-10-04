angular.module("pocApp")

    .service('vsSvc', function(cmTesterSvc,utilsSvc,$q,$http) {

        //cache of all vs. rebuilt each time the app runs. todo: could load into persistent browser cache like conceptmap stuff
        let cache = {}


        return {

            updateVSFromUrlHashDEP : function (hash,cb) {
                let lst = []
                let that = this
                for (const url of Object.keys(hash)) {
                    let vs = that.fixUrl(url)            //adds the NXHTS prefix if missing

                    if (! cache[vs]) {    //only add once!
                        lst.push(vs)
                    }


                }

                that.updateCacheFromList(lst, cb)
            },

            updateCacheFromList : function(lst,cb) {
                let that = this
                cmTesterSvc.getVSContentsHash(lst).then(
                    function (vo) {
                        let hash = vo.hashExpanded

                        that.setVSContents(hash)
                        //hashVS = hash


                        let size1 = utilsSvc.getSizeOfObject(hash)
                        console.log(`Size of retrieved VS: ${size1/1024} K`)

                        let size2 = utilsSvc.getSizeOfObject(cache)
                        console.log(`Size of full VS cache: ${size2/1024} K`)



                        cb()
                    }, function () {
                        //If a VS is not
                        cb()
                    }
                )
            },

            getSingleVS : function(url) {
                let deferred = $q.defer()
                let that = this

                let qry = `ValueSet/$expand?url=${that.fixUrl(url)}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`
                let encodedQry = encodeURIComponent(qry)
                let call = `nzhts?qry=${encodedQry}`

                $http.get(call).then(
                    function (response) {
                        //console.log(`${url} success`)
                        if (response.data && response.data.expansion && response.data.expansion.contains) {

                            let ar = []
                            response.data.expansion.contains.forEach(function (concept) {
                                ar.push(concept)
                            })

                            deferred.resolve(ar)

                        } else {
                            deferred.reject()
                        }
                    }, function (err) {
                        deferred.reject()

                    })

                return deferred.promise
            },


            getAllVS : function(allElements, cb) {
                let that = this
            //return
            //a function that will get all of the valuesets in the list of elements and populate a hash cache
            // - like the concept map does. This will be memory intensive (may need to re-factor) but the intent
            //is to be able to avoid the async stuff

            let lst = []

            allElements.forEach(function (item) {
                if (item.ed && item.ed.valueSet) {
                    let vs = item.ed.valueSet
                    vs = that.fixUrl(vs)            //adds the NXHTS prefix if missing

                    if (lst.indexOf(vs) == -1 && ! cache[vs]) {    //only add once!

                        lst.push(vs)
                    }
                }

                if (item.ed && item.ed.conditionalVS) {
                    item.ed.conditionalVS.forEach(function (cvs) {
                        let vs = cvs.valueSet
                        if (vs) {
                            vs = that.fixUrl(vs)            //adds the NXHTS prefix if missing

                            if (lst.indexOf(vs) == -1 && ! cache[vs]) {    //only add once!

                                lst.push(vs)
                            }
                        }
                    })
                }




            })


                that.updateCacheFromList(lst, cb)

        },

            fixUrl(url) {
                if (url.indexOf('http') == -1) {
                    url = "https://nzhts.digital.health.nz/fhir/ValueSet/" + url
                }
                return url
            },
            setVSContents : function(hash) {
                //set the cache to a hash of concepts
                let that = this

                Object.keys(hash).forEach(function (url) {
                    let url1 = that.fixUrl(url)

                    cache[url1] = hash[url]
                })


            },
            getOneVS : function (url) {
                if (url) {
                    //get the contents for a single vs
                    let url1 = this.fixUrl(url)
                    return cache[url1]
                } else {
                    throw new Error("Calling getOneVS with an empty url")
                }

            },
            getOneVSAsyncDEP : function (url) {
                let deferred = $q.defer()
                let that = this
                if (url) {
                    //get the contents for a single vs
                    let url1 = this.fixUrl(url)
                    if (cache[url1]) {
                        deferred.resolve(cache[url1])
                    } else {
                        that.updateCacheFromList([url1],function () {
                            deferred.resolve(cache[url1])
                        })
                    }



                } else {
                    deferred.reject("Calling getOneVS with an empty url")
                }

                return deferred.promise

            }
        }

    })