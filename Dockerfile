# Use the ultra-lite image to stay within Render's free RAM limits
FROM frooodle/s-pdf:latest-ultra-lite

# Render routes web traffic through port 10000 by default
ENV PORT=10000
EXPOSE 10000

# Override Stirling PDF's default internal port 8080 to match Render
ENV SERVER_PORT=10000
