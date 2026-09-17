import os

import redis
from rq import Connection, Queue, Worker

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')


def main() -> None:
    redis_conn = redis.from_url(REDIS_URL)
    with Connection(redis_conn):
        worker = Worker(['default'])
        worker.work()


if __name__ == '__main__':
    main()
