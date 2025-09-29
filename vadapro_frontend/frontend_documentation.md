taro config project am libraries yg dipake disini yaa

<br><br>

### How the project is initiated
#### 1. command to initiate react project (using vite, will automaticly create new folder) :
```
npm create vite@latest (will automaticly download vite if not already installed)
```
use "vadapro_frontend" as project name <br>
select react framework  <br>
select javascript variant   <br>

result : a folder called "vadapro_frontend" will be added

#### 2. command to install tailwind css into react + vite project :
```
npm install -D tailwindcss@3 postcss autoprefixer
```

#### 3. command to initiate tailwind in react + vite project :
```
npx tailwindcss init -p
```
result : folders "postcss.config.js" and "tailwind.config.js" will be added

#### 4. add this to "tailwind.config.js" file in content section :
```
"./index.html",
"./src/**/*.{js,ts,jsx,tsx}",
```
result : tailwind able to scan all the template files

#### 5. add this to "index.css" file at the very top :
```
@tailwind base;
@tailwind components;
@tailwind utilities;
```
result : tailwind features can be used inside the project