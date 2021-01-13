import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

// if (process.env.NODE_ENV === 'production') {
//   logger.add(new winston.transports.File({ filename: 'api.log', format: winston.format.simple() }));
// }

export default logger;
