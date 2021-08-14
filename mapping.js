const fs = require('fs');
const readline = require('readline');


if (!fs.existsSync('files')) {
    process.exit(1)
}
const keyed = [[/^server_name\s+(.+)$/, 'name'], [/^listen\s+(.+)$/, 'port'], [/^root\s+(.+)$/, 'root']]
function doGetMappings(host, port, user, pass) {
    const destDir = `files/${host}`
    if (!fs.existsSync(destDir)) return;
    const found = Object.create(null);
    let match;
    fs.readdirSync(destDir).forEach(
        f => {
            console.log(f);
            const lines = fs.readFileSync(`${destDir}/${f}`, 'utf8').split(/[\n;{}]+/)
                .map(v => v.trim())
                .filter(v => v.length).filter(v => v[0] != '#');
            found[f] = [];
            let server = null
            for (const line of lines) {
                if (line == 'server') {
                    if (server != null && Object.keys(server).length) {
                        found[f].push(server)
                    }
                    server = {}
                } else {
                    for (const k of keyed) {
                        if ((match = line.match(k[0]))) {
                            if (!server[k[1]]) {
                                server[k[1]] = []
                            }
                            server[k[1]].push(match[1])
                            break;
                        }
                    }
                }
            }
            if (server != null && Object.keys(server).length) {
                found[f].push(server)
            }
            found[f].forEach(v => {
                if (v.name && v.name.length == 1) {
                    v.name = v.name[0]
                }
                if (v.root && v.root.length == 1) {
                    v.root = v.root[0]
                }
                if (Array.isArray(v.port)) {
                    v.port = v.port[0]
                }
            })

        }
    )
    return found;

}
fs.readFile('servers.txt', 'utf8', async (e, data) => {
    if (e) return console.error(e)
    const lines = data.split(/\n+/);
    let group = '';
    const fresult = fs.openSync('results.html', 'w');
    fs.writeFileSync(fresult, `<!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1'>
    </head>
    <body>
        <table>
        <tr><th>Web</th><th>Port</th><th>Root</th></tr>`)
    for (let line of lines) {
        line = line.trim();
        if (!line.length) continue;

        if (line[0] == '#') {
            group = line.substr(1)
            continue;
        }
        const row = line.split(/\s+/, 5);

        if (row.length != 5) {
            console.log(`Skipping ${row[0]}: only ${row.length} col`);
            continue
        }
        const [host, port, user, pass, os] = row
        const found = doGetMappings(...row)
        if (!found) continue;
        const vhostFiles = Object.keys(found)
        if (!vhostFiles.length) continue;


        fs.writeSync(fresult, `<tr><th><h2>${host}</h2></th><th>${user}</th><th>${pass}</th></tr>`);
        fs.writeSync(fresult, `<tr><th collspan="3"><code>ssh -p ${port} ${user}@${host}</code></th></tr>`);
        fs.writeSync(fresult, `<tr><th collspan="3"><code>sshfs ${user}@${host}:/ /media/net/idn -p ${port} </code></th></tr>`);

        for (const file of vhostFiles) {
            for (const item of found[file]) {
                let rows = [item.name || '', item.port || '', item.root || ''];
                fs.writeSync(fresult, `<tr><td>${rows.join('</td><td>')}</td></tr>`);

            }
        }
        //break;
    }
    fs.writeFileSync(fresult, `</table></body></html>`)
    fs.closeSync(fresult);
})