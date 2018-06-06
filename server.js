const fs = require('fs')
const express = require('express')
const cors = require('cors')
const path = require('path')
const { createClient } = require('lightrpc');
const htmlEncode = require('htmlencode').htmlEncode;
const app = express()
app.use(cors())
const port = process.env.PORT || 3000
const jsonfile = require('jsonfile')

const rootDomain = 'https://fundition.io'

const lightrpc = createClient('https://api.steemit.com');

let layouts = {}

app.use('/files', express.static(path.join(__dirname, 'public/files')))
app.use('/favicon.ico', express.static(path.join(__dirname, 'public/files/fnd.png')))
app.get('*', function(req, res, next) {
    var reqPath = null
    if (req.query._escaped_fragment_ && req.query._escaped_fragment_.length > 0)
        reqPath = req.query._escaped_fragment_
    else
        reqPath = req.path

    if (reqPath.startsWith('/sockjs/info')) {
        res.send('{}')
        return;
    }
        getProjectHTML(
        reqPath.split('/')[1],
        reqPath.split('/')[2],
        function(err, contentHTML, pageTitle, description, url, thumbnail) {
            if (error(err, next)) return
            getRobotHTML(function(err, baseHTML) {
                if (error(err, next)) return
                baseHTML = baseHTML.replace(/@@CONTENT@@/g, contentHTML)
                baseHTML = baseHTML.replace(/@@TITLE@@/g, htmlEncode(pageTitle))
                baseHTML = baseHTML.replace(/@@DESCRIPTION@@/g, htmlEncode(description))
                baseHTML = baseHTML.replace(/@@URL@@/g, htmlEncode(url))
                baseHTML = baseHTML.replace(/@@URLNOHASH@@/g, htmlEncode(url).replace('/#!',''))
                // facebook minimum snap is 200x200 otherwise useless
                baseHTML = baseHTML.replace(/@@SNAP@@/g, htmlEncode(thumbnail))
    
                res.send(baseHTML)
            })
        })
})

app.listen(port, () => console.log('minifundition listening on port '+port))

function error(err, next) {
    if (err) {
        console.log(err)
        next()
        return true
    }
    return false
}

function getRobotHTML(cb) {
    if (layouts.robot) {
        cb(null, layouts.robot)
        return
    }
    else {
        fs.readFile(path.join(__dirname,"static","robots.html"), 'utf8', function (err,data) {
            if (err) {
                cb(err)
                return
            } else {
                layouts.robot = data
                cb(null, data)
                return
            }
        });
    }
}

function getProjectHTML(author, permlink, cb) {
    lightrpc.send('get_state', [`/myfundition/${author}/${permlink}`], function(err, result) {
        if (err) {
            cb(err)
            return
        }
        author = author.replace('@','')
        var project = parseProject(result.content[author+'/'+permlink])
        if (!project.title || !project.description) {
            cb('Weird error')
            return;
        }
        var hashVideo = video.content.video480hash ? video.content.video480hash : video.content.videohash
        var upvotedBy = []
        var downvotedBy = []
        for (let i = 0; i < video.active_votes.length; i++) {
            if (parseInt(video.active_votes[i].rshares) > 0)
                upvotedBy.push(video.active_votes[i].voter);    
            if (parseInt(video.active_votes[i].rshares) < 0)
                downvotedBy.push(video.active_votes[i].voter);         
        }

        var html = ''
        html += '<video src="https://ipfs.io/ipfs/'+hashVideo+'" poster="https://ipfs.io/ipfs/'+video.info.snaphash+'" controls></video><br />'
        html += '<h1>'+video.info.title+'</h1>'
        html += '<h2>Author: '+video.info.author+'</h2>'
        html += '<h2>Date: '+video.created.split('T')[0]+'</h2>'
        html += '<p><strong>Description: </strong>'+video.content.description.replace(/(?:\r\n|\r|\n)/g, '<br />')+'</p>'
        if (upvotedBy.length > 0) {
            html += '<p><strong>Upvoted by: </strong>'
            html += upvotedBy.join(', ')
            html += '</p>'
        }
        if (downvotedBy.length > 0) {
            html += '<p><strong>Downvoted by: </strong>'
            html += downvotedBy.join(', ')
            html += '</p>'
        }
        
        var url = rootDomain+'/#!/'+video.info.author+'/'+video.info.permlink
        var snap = 'https://ipfs.io/ipfs/'+video.info.snaphash
        var urlVideo = 'https://ipfs.io/ipfs/'+hashVideo
        var embedUrl = 'https://emb.d.tube/#!/'+video.info.author+'/'+video.info.permlink+'/true'
        var duration = video.info.duration || null
        var description = video.content.description.replace(/(?:\r\n|\r|\n)/g, ' ').substr(0, 300)
        cb(null, html, video.info.title, description, url, snap, urlVideo, duration, embedUrl)
    })
}

function parseProject(project, isComment) {
      console.log("vv" + project)
    try {
      var newProject = JSON.parse(project.json_metadata)
      } catch(e) {
        console.log(e)
    }
    if (!newProject) newProject = {}
    newProject.active_votes = video.active_votes
    newProject.author = video.author
    newProject.body = video.body
    newProject.total_payout_value = video.total_payout_value
    newProject.curator_payout_value = video.curator_payout_value
    newProject.pending_payout_value = video.pending_payout_value
    newProject.permlink = video.permlink
    newProject.created = video.created
    newProject.net_rshares = video.net_rshares
    newProject.reblogged_by = video.reblogged_by
    return newProject;
}
