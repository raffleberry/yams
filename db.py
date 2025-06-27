import sqlite3
import yams


def L():
    return sqlite3.connect(yams.DB_LOCAL)


def R():
    return sqlite3.connect(yams.DB_REMOTE)
