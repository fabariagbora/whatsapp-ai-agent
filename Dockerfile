# Use the prebuilt Evolution API image
FROM atendai/evolution-api:latest

# Expose the port Evolution listens on
EXPOSE 8080

# Run the API
CMD [ "sh", "-c", "node dist/main.js" ]
