import { createPrivateProjectBackup } from "../server/projectBackupService";

createPrivateProjectBackup()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
