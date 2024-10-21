FROM caddy:latest

ADD dist /src

ADD Caddyfile /etc/Caddyfile

WORKDIR /src

ENV PD_ENDPOINT=localhost:9000 REGION_BYTE_SIZE=100663296 PORT=8010 HOST=0.0.0.0

EXPOSE 8010

ENTRYPOINT ["/bin/sh", "-c", "sed -i -e \"s/PD_ENDPOINT/$PD_ENDPOINT/g\" /etc/Caddyfile;caddy run adapt --config /etc/Caddyfile"]
