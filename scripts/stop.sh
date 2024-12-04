cd network && docker compose down
cd ..
cd blockscout && docker compose -f geth.yml down
cd ..
cd dora && docker compose down