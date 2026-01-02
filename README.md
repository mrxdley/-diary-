# tales of anon

48  hour vibecode project  
turns journal entries into greentexts 

accessible on `https://tales-of-anon-production.up.railway.app/`
if i feel like keeping it up

## Installation

just node and npm
then

```bash
npm install dotenv express-rate-limit cors sqlite3 express
```
```
cd frontend
npm run build
mv ./build ../
cd ..
node server.js
```

## Usage
In `options` form, put `memories` to see the model's saved memories and `clear` to clear the chat + memories
