const fs = require('fs')
const express = require('express')
const cors = require('cors')
const path = require('path')
const { createClient } = require('lightrpc');
const htmlEncode = require('htmlencode').htmlEncode;
const app = express()
app.use(cors())
const port = process.env.PORT || 3000
const file = 'robots.json'
// currently whitelisting a few robots
// const allowedRobots = ['facebookexternalhit', 'Discordbot', 'Slackbot'
//     , 'bingbot', 'Twitterbot']
const rootDomain = 'https://fundition.io'

const lightrpc = createClient('https://api.steemit.com');

let layouts = {}
console.log(app)
app.use('/files', express.static(path.join(__dirname, 'public/files')))
app.use('/favicon.ico', express.static(path.join(__dirname, 'public/files/fnd.png')))
app.get('*', function (req, res, next) {
    //var isRobot = getRobotName(req.headers['user-agent'])
    console.log("St" +req,res,next)
    // parsing the query
    var reqPath = null
    if (req.query._escaped_fragment_ && req.query._escaped_fragment_.length > 0)
        reqPath = req.query._escaped_fragment_
    else
        reqPath = req.path

    if (reqPath.startsWith('/sockjs/info')) {
        res.send('{}')
        return;
    }
    console.log("PAAAAath" + reqPath)
    getprojectHTML(
        reqPath.split('/')[0],
        reqPath.split('/')[1],
        function (err, contentHTML, pageTitle, description, url) {
            if (error(err, next)) return
            getRobotHTML(function (err, baseHTML) {
                if (error(err, next)) return
                baseHTML = baseHTML.replace(/@@CONTENT@@/g, contentHTML)
                baseHTML = baseHTML.replace(/@@TITLE@@/g, htmlEncode(pageTitle))
                baseHTML = baseHTML.replace(/@@DESCRIPTION@@/g, htmlEncode(description))
                baseHTML = baseHTML.replace(/@@URL@@/g, htmlEncode(url))
                baseHTML = baseHTML.replace(/@@URLNOHASH@@/g, htmlEncode(url).replace('/#!', ''))
                // facebook minimum snap is 200x200 otherwise useless

                res.send(baseHTML)
            })
        })

})

app.listen(port, () => console.log('minidtube listening on port ' + port))

function error(err, next) {
    if (err) {
        console.log(err)
        next()
        return true
    }
    return false
}

function getprojectHTML(author, permlink, cb) {
    lightrpc.send('get_state', [`/${author}/${permlink}`], function (err, result) {
        if (err) {
            cb(err)
            return
        }
        console.log(result)
        var project = result
        var html = ''
        html += '<h1>' + project.json_metadata.basics.title + '</h1>'
        html += '<h2>Author: ' +  project.json_metadata.basics.title + '</h2>'
        html += '<h2>Date: ' + project.created.split('T')[0] + '</h2>'
        html += '<p><strong>Description: </strong>' + project.json_metadata.basics.description.replace(/(?:\r\n|\r|\n)/g, '<br />') + '</p>'
        var url = rootDomain + '/#!/' + project.author + '/' + project.permlink
      
        var description = project.json_metadata.basics.description.replace(/(?:\r\n|\r|\n)/g, ' ').substr(0, 300)
        cb(null, html, project.title, description, url)
    })
}

