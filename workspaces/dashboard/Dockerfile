FROM nginx:1.28-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files (HTML, CSS, JS)
COPY static/ /usr/share/nginx/html/

# Copy data files (state.json, configs)
COPY data/ /usr/share/nginx/html/data/

# Copy docs (markdown files)
COPY docs/ /usr/share/nginx/html/docs/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
