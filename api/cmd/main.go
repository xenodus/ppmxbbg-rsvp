package main

import (
	"ppmxbbg-rsvp/handler"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	lambda.Start(handler.RSVP)
}
