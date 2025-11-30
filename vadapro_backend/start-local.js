// Local helper to start the Express app for development/testing only.
// This file is NOT used in production (Vercel uses the api/ wrapper).
import app from './server.js';

const port = process.env.PORT || 3001;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`VADAPRO backend (local) listening on http://localhost:${port}`);
});
