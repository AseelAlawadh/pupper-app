#### Component 1 - Database and REST API
- Schema / Data structure(s) defined.
- Database of choice deployed (NoSQL / Relational)
- REST API deployed
    - Routes to store information in the database
    - Routes to retrieve information from the database

#### Component 2 - Observability & Monitoring
- Unit tests are created for REST API
- Unit tests are created for CDK
- Structured logging has been added to all resources.
- Tracing has been implemented to all resources.
- CDK Nag is added to the project, runs locally, and is implemented within CDK stacks.
- Linting and formatting are added to the project, runs locally, and has been applied.

#### Component 3 - Image Processing
- Backend services allow an image to be uploaded and stored.
- Image upload service can handle images larger than 10MB.
- An image is automatically re-sized when it has been uploaded and the original is retained.
- Information about both the original image and re-sized image are stored for later retrieval.

#### Component 4 - Front End Website
- Create a React application that users will use to interact with your REST API.
- The website should display dogs that are available for adoption, as well as information about the dog.
- It should display thumbnails (your re-sized images) that users can click to view the original image of the dog.


#### Component 5 - Authentication & Authorization
- Create a Cognito user pool to be integrated with your application.
- Integrate the Cognito user pool with your React application.
    - New users can sign-up.
    - A password policy has been set.
    - Users must login before being able to upload images or search/view.
- Secure your backend API.

#### Component 6 - Front End Features
- Add functionality to your website to enable users to search/filter results.
- Add functionality to your website to enable users to wag/growl dogs.
- Add functionality or a new page to show users the dogs they have wagged or growled.

#### Component 7 - Image Classification
- Add image classification to your application to ensure only labrador retreivers are uploaded.
- Non-labrador retrievers will be uploaded by a user, but rejected from further processing and the user will be notified.

#### Component 8 - Image Generation
- Users should be able to put a dog up for adoption without an image. Your application will take a description of the dog, and generate an image using Amazon Nova. This image will then be processed, re-sized, and stored with the dog's information.

#### Component 9 - Sentiment Analysis
- Use Amazon Bedrock and prompt engineering to analyze the sentiment and emotions of the dog images when users upload them.
- You should display the output as keywords or tags on the website with the image.

#### Compnoent 10 - Text Extraction
- Users can upload a form / document that contains the relevant dog adoption information, in addition to providing the image to the website.
- Back-end services should process the file automatically, and extract and store the necessary information with the image.

#### Component 11 - Real-Time Inference
- Enable users to submit information about themselves and what kind of dog they're looking for via the front-end website.
- Use the user provided information to make real-time inference requests to identify the best dog for a user to adopt.
