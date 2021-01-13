import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";

function getRequiredEnv(envVarKey: string): string {
  const envVarVal = process.env[envVarKey];
  if (!envVarVal) {
    throw new Error(`Unable to load environment variable ${envVarKey}.`);
  }
  return envVarVal;
}

export default {
  portNumber: Number(process.env.EXPRESS_PORT_NUMBER) || 8080,
  url: {
    platformService: getRequiredEnv("PLATFORM_SERVICE_URL"),
    transactionService: getRequiredEnv("TRANSACTION_SERVICE_URL"),
  },
};
