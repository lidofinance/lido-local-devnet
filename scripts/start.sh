cd network && docker compose up -d
cd ..
cd blockscout && docker compose -f geth.yml up -d
cd ..
cd dora && docker compose up -d