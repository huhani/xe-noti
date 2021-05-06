XE 웹푸시 모듈
======================
# 1. XE 웹푸시 모듈

XE, Rhymix에서 댓글

# 2. 서버 요구사항
* DB는 반드시 MySQL(MariaDB)여야 합니다. MSSQL, CUBRID와 같은 DB는 지원하지 않습니다.

|Name            | Version            |description |
|----------------|--------------------|------------|
|PHP             |7.1 or greater      |            |
|MySQL(MariaDB)  |                    |            |
|nodejs          |6.17 or greater     |            |
|RabbitMQ        |9.1.0               |            |


# 3. 설치
## 3.1. RabbitMQ 설치
## 3.2. NodeJS 설치
## 3.3. 모듈 설치
1. /module/sticker에 모듈 파일 복사
2. https://github.com/huhani/xe-sticker-skins default 스킨 파일을 /module/sticker/skins/default로 복사
3. /index.php?module=admin 에서 모듈 설치 후 //your-domain.com/index.php?mid=sticker (혹은 /sticker) 이동 후 정상동작 확인
4. 이후 게시판 스킨단 커스터마이징은 https://github.com/huhani/xe-sticker-example 파일을 참조하세요. PC는 12개, Mobile은 5개 기본 출력으로 되어있습니다. 참조 사이트 : https://gamezot.net/sticker

#4. 라이센스
MIT License

Copyright (c) 2021 Huhani <https://dnip.co.kr>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.