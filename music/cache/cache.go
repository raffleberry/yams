package cache

var cache = map[string][]byte{}

func Get(key string) []byte {
	return cache[key]
}

func Set(key string, value []byte) {
	cache[key] = value
}

func Delete(key string) {
	delete(cache, key)
}

func Clear() {
	for k := range cache {
		delete(cache, k)
	}
}

func Exists(key string) bool {
	_, ok := cache[key]
	return ok
}

func Size() int {
	return len(cache)
}

func Keys() []string {
	keys := []string{}
	for k := range cache {
		keys = append(keys, k)
	}
	return keys
}
