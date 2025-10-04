# Use an official Node.js image as base
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy everything including node_modules
COPY . .

# Expose the port your app uses
EXPOSE 9500

# Run your app
CMD ["./localrun.sh"]
