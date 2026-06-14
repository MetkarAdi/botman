const http = require('http');

function keepAlive() {
    const server = http.createServer((req, res) => {
        const serverTime = new Date().toISOString();
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>b0tman Status</title>
    <style>
        :root {
            color-scheme: dark;
            --bg: #0f1117;
            --panel: #171a23;
            --text: #f5f7fb;
            --muted: #9aa4b2;
            --accent: #43b581;
            --border: #272b36;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: radial-gradient(circle at top, #1c2230 0, var(--bg) 48%);
            color: var(--text);
            font-family: Arial, Helvetica, sans-serif;
        }

        main {
            width: min(92vw, 460px);
            padding: 36px;
            text-align: center;
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 8px;
            box-shadow: 0 22px 70px rgba(0, 0, 0, 0.35);
        }

        h1 {
            margin: 0 0 18px;
            font-size: 40px;
            line-height: 1.1;
            letter-spacing: 0;
        }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 26px;
            padding: 8px 14px;
            color: var(--accent);
            background: rgba(67, 181, 129, 0.12);
            border: 1px solid rgba(67, 181, 129, 0.34);
            border-radius: 999px;
            font-weight: 700;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--accent);
            box-shadow: 0 0 18px rgba(67, 181, 129, 0.9);
        }

        .label {
            margin: 0 0 8px;
            color: var(--muted);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        time {
            display: block;
            color: var(--text);
            font-family: Consolas, Monaco, monospace;
            font-size: 15px;
            overflow-wrap: anywhere;
        }
    </style>
</head>
<body>
    <main>
        <h1>b0tman</h1>
        <div class="status"><span class="dot"></span><span>Online</span></div>
        <p class="label">Current Server Time</p>
        <time datetime="${serverTime}">${serverTime}</time>
    </main>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`Keep-alive server running on port ${port}`);
    });
}

module.exports = keepAlive;
