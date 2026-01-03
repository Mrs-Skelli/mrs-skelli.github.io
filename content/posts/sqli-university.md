---
title: "SQL Injection in University"
date: 2025-11-18
draft: false
description: "An SQL Injection Attack found on a European university."
summary: "An SQL Injection Attack found on a European university."
---


# Too Long, Didn't Read:
```ruby
[SQL Injection in University Application]

[Unparameterized Query in AJAX Endpoint]
A European university's application accepts user input directly in SQL queries without proper sanitization
                   ↓
[Stack Trace Information Disclosure]
SQL syntax errors reveal database structure, file paths, and application framework details
                   ↓
[Potential Data Exfiltration]
Vulnerable parameter allows for SQL injection, enabling database enumeration and data extraction
```

# The Preface
Full disclosure, a lot of pieces in this blog post will be redacted. That's the nature of the beast sometimes. However I found a SQL injection vulnerability in a European university's application, which was quite a nice find for me. Injection attacks are slowly declining, and are moving down the leaderboard of OWASP's Top 10 most common attacks. It's becoming increasingly more rare to find SQLi vulnerabilities, but I wanted to document my finding

# The Discovery
Burp is a girls best friend. I had thrown my target into Burp and began crawling the website when an interesting endpoint was flagged. I noticed 33 parameters, some of them mentioning columns and order. This was very interesting to me because it immediately indicated that this was a good attack vector for SQLi. Although, I did encounter WAF limiting issues returning a 530 status error, which occurs at the DNS level. Despite that, I had begun looking at testing each parameter one by one and noticed a very interesting AJAX endpoint that handled DataTables requests.

I wasn't able to retrieve any database information *yet*, but I was able to receive stack trace errors when a quote was injected within one of the parameters.

## Vulnerability Details
- **Vulnerability Type**: SQL Injection
- **Affected Software**: CodeIgniter-based application (appears to be version 5.4.7)
- **Database**: MariaDB
- **Severity**: Critical

# The Exploitation

### Technical Explanation
The vulnerability exists in an AJAX endpoint that handles DataTables requests. The application fails to properly sanitize user input before incorporating it into SQL queries. When a single quote (`'`) is injected into the `filter[]` parameter, the application generates a SQL syntax error that reveals:

1. The database structure and query being executed
2. Full file paths on the server
3. The application framework (CodeIgniter)
4. The database driver being used (mysqli)
5. Internal application structure and model/controller names

The error message shows that user input is being directly concatenated into the SQL query without parameterization or proper escaping.

### Method 1: Using a GET Request

Send the following GET request to the vulnerable endpoint:

```http
GET /[REDACTED]/[REDACTED]/ajax?filter%5B%5D=1))%20AND--%20 HTTP/2
Host: [REDACTED]
User-Agent: [REDACTED]
X-Requested-With: XMLHttpRequest
Referer: https://[REDACTED]/[REDACTED]/[REDACTED]
```

### Method 2: Using cURL

Alternatively, you can use the following cURL command:

```bash
curl --path-as-is -i -s -k -X $'GET' \
    -H $'Host: [REDACTED]' \
    -H $'X-Requested-With: XMLHttpRequest' \
    -H $'Referer: https://[REDACTED]/[REDACTED]/[REDACTED]' \
    $'https://[REDACTED]/[REDACTED]/[REDACTED]/ajax?filter%5B%5D=1))%20AND--%20'
```

**Note**: The injection payload `1))%20AND--%20` (URL decoded: `1)) AND-- `) is injected into the `filter[]` parameter to trigger the SQL syntax error.

## Proof of Concept

Below are additional HTTP request and HTTP response examples that demonstrate the vulnerability:

```http
GET /[REDACTED]/[REDACTED]/ajax?filter%5B%5D=3' HTTP/2
Host: [REDACTED]
Accept: application/json, text/javascript, */*; q=0.01
Cookie: [REDACTED]
X-Requested-With: XMLHttpRequest
```

**Key injection point**: `filter%5B%5D=3'` (URL decoded: `filter[]=3'`)

Within the response we received both a stack trace and fatal SQL error.

The stack trace reveals:
- The application is using CodeIgniter framework
- The vulnerable code is in a model file, specifically in a method that handles DataTables list loading
- The controller handling this is in an AJAX endpoint method
- The database query involves published status checks and name-based ordering
- Full server file paths are exposed (though redacted here)

# Impact Assessment

An attacker can exploit this vulnerability to execute arbitrary SQL queries on the server, potentially gaining unauthorized access to sensitive data, modifying/deleting data, or performing other malicious actions.

Specific impacts include:

- **Database Enumeration**: An attacker could enumerate database structure, table names, and column names
- **Data Exfiltration**: Sensitive data stored in the database could be extracted, potentially including user information, academic records, or other confidential data
- **Information Disclosure**: The stack trace reveals internal application structure, file paths, and framework details that could aid in further attacks
- **Data Manipulation**: Depending on database permissions, an attacker could potentially:
  - Read arbitrary data from the database
  - Modify or delete existing records
  - Insert malicious data
  - Potentially achieve remote code execution if certain conditions are met

# Remediation

Input validation and sanitization should be implemented to prevent SQL injection attacks. It's also important to ensure that [the university's] developers:

- **Use Parameterized Queries**: All database queries must use prepared statements to prevent injection. CodeIgniter provides query binding methods that should be used instead of direct string interpolation. Replace all direct string concatenation in SQL queries with parameterized/prepared statements.
- **Input Validation**: Restrict input fields to expected values (e.g., numbers for IDs). Implement strict input validation and sanitization for all user-supplied parameters, especially array parameters like `filter[]`
- **Error Handling**: Disable detailed error messages in production environments. Stack traces should not be exposed to end users as they reveal sensitive information about the application structure.
- **WAF Configuration**: While a WAF is in place, it should be configured to detect and block SQL injection attempts more effectively.

# Final Words
Finding this SQL injection in the wild was a significant milestone for me. It reinforced the importance of thorough testing, even when automated tools hit roadblocks like WAF restrictions. Sometimes the manual approach and paying attention to error messages can reveal vulnerabilities that automated scanners might miss. Doing it the hard way continues to prevail. 

## References

- [CWE-89: Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')](https://cwe.mitre.org/data/definitions/89.html)
- [OWASP: SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [PortSwigger: SQL Injection](https://portswigger.net/web-security/sql-injection)


