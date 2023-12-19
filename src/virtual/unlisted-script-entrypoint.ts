import definition from 'virtual:user-unlisted-script';
import { logger } from '../sandbox/utils/logger';

(async () => {
  try {
    await definition.main();
  } catch (err) {
    logger.error(
      `The unlisted script "${__ENTRYPOINT__}" crashed on startup!`,
      err,
    );
  }
})();
