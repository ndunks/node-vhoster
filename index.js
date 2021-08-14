
const fs = require('fs');
const pty = require('node-pty');
const PAUSE = '\x13';   // XOFF
const RESUME = '\x11';  // XON
if (!fs.existsSync('files')) {
    fs.mkdirSync('files');
}

function doGetVhosts(host, port, user, pass) {
    const destDir = `files/${host}`
    if (fs.existsSync(destDir)) return;
    fs.mkdirSync(destDir);
    return new Promise(
        (res, rej) => {
            const shell = pty.spawn('scp', [
                '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null',
                '-P', port, `${user}@${host}:/etc/nginx/sites-enabled/*`, destDir
            ])
            let step = 0;
            shell.on('data', data => {
                if (step == 0 && data.indexOf('password:') >= 0) {
                    shell.write(pass + "\n");
                    step++
                } else {
                    if (data.indexOf('denied') >= 0) {
                        console.log('LOGIN FAIL', host, pass)
                        fs.rmdirSync(destDir)
                        shell.kill()
                    } else {
                        console.log(data)
                    }
                }
            })
            shell.on('exit', res)
        }
    )
}
fs.readFile('servers.txt', 'utf8', async (e, data) => {
    if (e) return console.error(e)
    const lines = data.split("\n");
    let group = '';

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
        let [host, port, user, pass, os] = row
        if (row[4].toLowerCase() != 'linux') {
            console.log(`Skipping ${host}: ${os}`);
            continue
        }

        await doGetVhosts(...row)
    }
})