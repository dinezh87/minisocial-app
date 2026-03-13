package main

import (
 "database/sql"
 "encoding/json"
 "fmt"
 "net/http"
 "os"

 _ "github.com/go-sql-driver/mysql"
)

type User struct {
 ID int
 Name string
 Bio string
}

var db *sql.DB

func profile(w http.ResponseWriter,r *http.Request){

 rows,_ := db.Query("SELECT id,name,bio FROM users")

 users := []User{}

 for rows.Next(){
  u := User{}
  rows.Scan(&u.ID,&u.Name,&u.Bio)
  users = append(users,u)
 }

 json.NewEncoder(w).Encode(users)
}

func main(){

 mysqlHost := os.Getenv("MYSQL_HOST")
 mysqlPort := os.Getenv("MYSQL_PORT")
 mysqlUser := os.Getenv("MYSQL_USER")
 mysqlPassword := os.Getenv("MYSQL_PASSWORD")
 mysqlDB := os.Getenv("MYSQL_DB")
 port := os.Getenv("PORT")

 if port == "" {
  port = "8080"
 }

 dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s",
  mysqlUser, mysqlPassword, mysqlHost, mysqlPort, mysqlDB)

 db,_ = sql.Open("mysql", dsn)

 http.HandleFunc("/users",profile)

 http.ListenAndServe(":" + port, nil)
}