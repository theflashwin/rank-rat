package middlewares

import (
	"crypto/rand"
	"math/big"
)

const (
	alphanumericChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	minCodeLength     = 4
	maxCodeLength     = 8
)

// GenerateRandomCode creates a random alphanumeric code of length between 4-8
func GenerateRandomCode() (string, error) {
	length, err := rand.Int(rand.Reader, big.NewInt(maxCodeLength-minCodeLength+1))
	if err != nil {
		return "", err
	}
	codeLength := int(length.Int64()) + minCodeLength

	code := make([]byte, codeLength)
	for i := range code {
		charIndex, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphanumericChars))))
		if err != nil {
			return "", err
		}
		code[i] = alphanumericChars[charIndex.Int64()]
	}

	return string(code), nil
}
