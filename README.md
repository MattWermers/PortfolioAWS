# Personal Portfolio Project with attached Web App
Matt Wermers CSPB3112-800C

## Introduction
My primary goal for the project was to create a personal portfolio for myself, and to showcase at least one thing I have developed on that portfolio. I had a lot of ideas of what I could create but decided that the projects I am pursuing in Software Development and Data Mining were the perfect choices. I had a secondary focus of creating a webpage for my girlfriend which would include a blog style page for her writing and her recipes.

## Background
This project was really about learning web development in general. Front end, back end, deployment, and hosting. It took the form of a portfolio to aid in networking, but it will more than likely serve as a resume aid. This project is extremily important to my career goal to become a full stack developer, this project essentially was that goal manifested.

## Methodology, Materials, and Methods

### Methodology
This was first (first and a half maybe?) attempt developing software and I actually learned how to properly document, test, and develop this semester. Consequentally, my methodology was a very informal agile style. I set small goals for myself whenever I sat down, and did not get up until I completed one. These goals started off very basic, like "implement a header", and later became more and more complex.

For development of the static site this was straight forward and worked fine. 

Testing and documenting was strained by my development approach. I honestly had a lot of fun building the project and seeing what I could do, and got carried away down this path. All testing and debugging (outside of the db creation script) occured using the in browser Developer Tools inspecter and console. I even tested the SQL querying using the Developer Tools console. I lack any unit tests or in depth documentation, but all of the programs functionality can be tested with high level tests. If the functionality of something could not be determined by just looking at the page, there is a good chance it logs something to the console.

Since I was new to web development I had to do a lot of research to do anything.
- If I knew what tool I wanted to use, but was unfamliar with actually using it, I would google the basics of that tool or read through the relevant documentation.
- When I had to approach a task I did not know the first thing about I would ask an LLM what tools or methods are typically used for the described task. I would ask it to provide multiple options and explain the differences and trade offs. I would google and read some of the documentation for the tool to learn how to implement what I need. If a response included code this would help direct me to exactly the right documenation.
- Networking and deployment of the app (AWS EC2, Nginx, and importlib specifically) I heavily relied on Gemini. I plan to continue work on the WFD app, and to include my data mining project which will have me returning to these concepts regularly in the future.
- When I encountered an error or was trying to implement something without a straight forward approach I would sometimes use an agent (Claude Sonnet/Opus or Gemini) to help me. I would direct it to the line or function of interest, descrbie the target behavior or appearance, and direct it to tell me how to fix the problem or build the function/object. I would follow its instructions and if the behavior was not what I expected or if I encountered a new error, I would repeat the process. This was extremily helpful because it'll catch something you looked over 100 times (like not including the correct class on an HTML object or telling you about a tool everyone on substack assumes you already know about) and I found myself regularly slapping my forehead.

### Materials
I primarily coded through VS Code, although sometimes I used Google Antigravity IDE when debugging as described above. I started on windows but have been using my WSL mount for a few months. Version control was/is done through Github. 

The site both static and routed is now hosted on a free tier AWS EC2 instance running on Ubuntu. To host the site, which used Ruby/Jekyll for the static portion and Flask for the routed WFD API I used Flask and Gunicorn. To get the site up and running I used Nginx to route to the Flask app, to obtain the SSL certificate from Certbot, and to serve my domain (purchased from GoDaddy). All of our JS is vanilla.

On the backend we use Python and SQLite. Our app is small and its function non-critical so this works great. Outside of the web hosting libraries, all python is vanilla.

## Results
I learned what it takes to build, deploy, and maintain a web app. I know I learned these things because my site is up and running right now. I am confident that if needed I could build and dedeploy a similar site again. I can look at a problem and understand what tools and what approach I need to take ahead of time, I can talk to others about web development, and I am coming up with ideas of how I can apply my new knowledge all the time. This to me indicates that I have learned the materials well.

My project assessment were light. I wanted to deploy an app that actually had usefull backend functionality (the usefullness of wfd is up for debate) and I did that. While most of this work comes from Software Dev, I leaned in heavily there to complete my goals in the class.

## Discussion/Reflection
As mentioned above I do believe I met my goal, but not exactly my stated one. I did not intergrate my work app but instead intergrated my Software Dev App. I am working on getting the work application intergrated and I hope I can by the due date tonight, and my data mining project tomorrow, otherwise that will happen this weekend.

I met my goals by diving in as soon as I got the chance, and kept up with them by just wanting to do the work.

I feel conficted about the results. I am proud of the WFD app I developed and in going above and beyond there I learned more than I expected to, but I wish I had more to show. I focused so much on getting things working the way I wanted to, with a stubborness focused on knowing what im doing, that I did not focus on actually buiding things with the skills I learned.

## Conclusion
This project was extremily rewarding and it is refreshing to feel excited about developing skills again. My outlook towards software development dramatically improved this semester. I mean this specifically and generally. I belive I can reach my career goals, I believe I can excell when I get there, and I have an internal drive to actually produce results when doing the work.

To be truthfull and a little sentimental this semester has actually dramatically changed the way I look at life. My career and schooling before this semester required funding or facilities not available to individuals. You can have skills and knowledge to genetically engineer *E.Coli* to live in beetle stomachs and digest PEG plastics, but this is not happening without the space or resources for thousands of dollars of lab equipment or a network of friends in unregulated labs. I now feel like I can sit down at home a build something useful.

One thing that I can thank this class for giving me is a passion for open source that I hope can grow into a network or a career. There are a lot of computational biologists out there that could really use some dev help from people with a background in biology.

## Bib
### Public Products
- Site: [mattwermers.me](https://mattwermers.me)
- Final Repo (differs from rest of the semester): [https://github.com/MattWermers/PortfolioAWS.git](https://github.com/MattWermers/PortfolioAWS.git)
- App: [WhatsForDinner](https://mattwermers.me/wfd/)

### Resources
- Jekyll (https://jekyllrb.com/docs/)
- Flask (https://flask.palletsprojects.com/en/3.0.x/)
- Gunicorn (https://docs.gunicorn.org/en/stable/)
- Nginx (https://nginx.org/en/docs/)
- Certbot (https://certbot.eff.org/docs/)
- SQLite (https://www.sqlite.org/docs.html)
- GoDaddy (https://www.godaddy.com/)
- AWS EC2

### Ai assistance
- Claude Sonnet/Opus (Anthropic)
- Google Gemini