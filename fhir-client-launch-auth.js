(function () {
  function guid () {
    function s4 () {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
  }

  function conformanceRequestCb (errback, callback, fhirServiceUrl, r) {
    try {
      r = JSON.parse(r)
      var provider = {
        name: 'SMART on FHIR Testing Server',
        description: 'Dev server for SMART on FHIR',
        url: fhirServiceUrl,
        oauth2: {
          registration_uri: null,
          authorize_uri: null,
          token_uri: null
        }
      }

      var smartExtension = r.rest[0].security.extension.filter(function (e) {
        return (e.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris')
      })

      smartExtension[0].extension.forEach(function (arg, index, array) {
        if (arg.url === 'register') {
          provider.oauth2.registration_uri = arg.valueUri
        } else if (arg.url === 'authorize') {
          provider.oauth2.authorize_uri = arg.valueUri
        } else if (arg.url === 'token') {
          provider.oauth2.token_uri = arg.valueUri
        }
      })
      callback && callback(provider)
    } catch (err) {
      return errback && errback(err)
    }
  }

  function getConformanceStatement (fhirServiceUrl, callback, errback) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', stripTrailingSlash(fhirServiceUrl) + '/metadata')
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        conformanceRequestCb(errback, callback, fhirServiceUrl, xhr.responseText)
      } else if (xhr.readyState === 4 && xhr.status !== 200) {
        errback(xhr.responseText)
      }
    }
    xhr.send()
  }

  doAuthorize =  function (params, errback) { // eslint-disable-line
    if (!errback){
      errback = function(err){
        console.log("Failed to discover authorization URL given " + err, params)
      }
    }

    // prevent inheritance of tokenResponse from parent window
    delete sessionStorage.tokenResponse

    if (!params.client){
      params = {
        client: params
      };
    }

    params.response_type = params.response_type || 'code'
    params.client.redirect_uri = params.client.redirect_uri || relative()
    if (!params.client.redirect_uri.match(/:\/\//)){
      params.client.redirect_uri = relative(params.client.redirect_uri);
    }

    if (!params.client.redirect_uri.match(/:\/\//)) {
      params.client.redirect_uri = relative(params.client.redirect_uri)
    }

    var launch = urlParam('launch')
    if (launch) {
      if (!params.client.scope.match(/launch/)) {
        params.client.scope += ' launch'
      }
      params.client.launch = launch
    }

    var server = urlParam('iss') || urlParam('fhirServiceUrl')
    if (server && !params.server) params.server = server

    getConformanceStatement(params.server, function (provider) {
      params.provider = provider

      var state = params.client.state || guid()
      var client = params.client

      sessionStorage[state] = JSON.stringify(params)

      var redirectTo = params.provider.oauth2.authorize_uri + '?' +
        'client_id=' + encodeURIComponent(client.client_id) + '&' +
        'response_type=' + encodeURIComponent(params.response_type) + '&' +
        'scope=' + encodeURIComponent(client.scope) + '&' +
        'redirect_uri=' + encodeURIComponent(client.redirect_uri) + '&' +
        'state=' + encodeURIComponent(state) + '&' +
        'aud=' + encodeURIComponent(params.server)

      if (typeof client.launch !== 'undefined' && client.launch) {
        redirectTo += '&launch=' + encodeURIComponent(client.launch)
      }

      window.location.href = redirectTo
    }, errback)
  }

  function urlParam (p) {
    var query = location.search.substr(1)
    var data = query.split('&')
    var result = []

    for (var i = 0; i < data.length; i++) {
      var item = data[i].split('=')
      if (item[0] === p) {
        var res = item[1].replace(/\+/g, '%20')
        result.push(decodeURIComponent(res))
      }
    }
    if (result.length) return result[0]
  }

  function stripTrailingSlash (str) {
    if (str.substr(-1) === '/') return str.substr(0, str.length - 1)
    return str
  }

  function relative (url) {
    return (window.location.protocol + '//' + window.location.host + window.location.pathname).match(/(.*\/)[^/]*/)[1] + (url || '')
  }
})()
