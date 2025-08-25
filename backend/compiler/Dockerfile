FROM archlinux:base-devel

RUN pacman -Sy --noconfirm gcc llvm18

COPY ./deen /usr/local/bin
RUN chmod +x /usr/local/bin/deen

COPY ./stdlib /sandbox/stdlib
ENV DEEN_LIB="/sandbox/stdlib"

RUN groupadd -r sandbox && \
  useradd -r -g sandbox -d /sandbox -s /sbin/nologin sandbox && \
  mkdir -p /sandbox && \
  chown sandbox:sandbox /sandbox

WORKDIR /sandbox
RUN chmod 777 /sandbox
USER sandbox:sandbox

# ENTRYPOINT ["deen"]
CMD ["deen"]
