import uvicorn
import logging
from uvicorn.config import LOGGING_CONFIG

# Customize Uvicorn's logging config
LOGGING_CONFIG["formatters"]["default"]["fmt"] = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
LOGGING_CONFIG["formatters"]["access"]["fmt"] = '%(asctime)s - %(levelname)s - %(client_addr)s - "%(request_line)s" %(status_code)s'

# Add debug level handler
LOGGING_CONFIG["handlers"]["default"]["level"] = "DEBUG"
LOGGING_CONFIG["handlers"]["access"]["level"] = "DEBUG"
LOGGING_CONFIG["loggers"]["uvicorn"]["level"] = "DEBUG"
LOGGING_CONFIG["loggers"]["uvicorn.error"]["level"] = "DEBUG"
LOGGING_CONFIG["loggers"]["uvicorn.access"]["level"] = "DEBUG"

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG,  # Set to DEBUG level
        format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="debug",  # Set to debug level
        log_config=LOGGING_CONFIG
    ) 