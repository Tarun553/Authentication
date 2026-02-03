import "dotenv/config";
import { createServer } from "./server.ts";
import { env } from "./common/config.ts";

createServer()
  .then(app => {
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  })
  .catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
